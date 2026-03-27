import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  getAppRole,
  getEmployeeByAuthUserId,
  requireAuthUser,
  requireSalonAccess,
} from "./lib/authz";

const activeBookingStatuses = new Set(["booked", "confirmed"]);
const referenceSlots = ["Forfra", "Side", "Bagfra"] as const;
type Ctx = QueryCtx | MutationCtx;
const BUSINESS_TIME_ZONE = "Europe/Copenhagen";
const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateTimePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function parseTimeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map((value) => Number(value));
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`Ugyldigt tidsformat: ${time}`);
  }
  return hour * 60 + minute;
}

function applyTimeToTimestamp(dayStartTs: number, time: string) {
  const minutes = parseTimeToMinutes(time);
  return dayStartTs + minutes * 60_000;
}

function getWeekdayFromDayStart(dayStartTs: number) {
  // `dayStartTs` comes from client-local midnight.
  // +12h avoids timezone boundary drift when read on server.
  return new Date(dayStartTs + 12 * 60 * 60 * 1000).getUTCDay();
}

function getNumericPart(
  parts: Intl.DateTimeFormatPart[],
  type: "year" | "month" | "day" | "hour" | "minute" | "second",
) {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) {
    throw new Error(`Mangler dato-del: ${type}`);
  }
  return Number(value);
}

function getTimeZoneOffsetAt(timestamp: number) {
  const parts = dateTimePartsFormatter.formatToParts(new Date(timestamp));
  const year = getNumericPart(parts, "year");
  const month = getNumericPart(parts, "month");
  const day = getNumericPart(parts, "day");
  const hour = getNumericPart(parts, "hour");
  const minute = getNumericPart(parts, "minute");
  const second = getNumericPart(parts, "second");
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - timestamp;
}

function getBusinessDayBounds(timestamp: number) {
  const parts = datePartsFormatter.formatToParts(new Date(timestamp));
  const year = getNumericPart(parts, "year");
  const month = getNumericPart(parts, "month");
  const day = getNumericPart(parts, "day");

  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const nextUtcMidnight = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);

  const dayStart = utcMidnight - getTimeZoneOffsetAt(utcMidnight);
  const dayEnd = nextUtcMidnight - getTimeZoneOffsetAt(nextUtcMidnight);
  return { dayStart, dayEnd };
}

async function getEmployeeDayContext(
  ctx: Ctx,
  employeeId: Id<"employees">,
  salonId: Id<"salons">,
  dayStartTs: number,
  dayEndTs: number,
  ignoreBookingId?: Id<"bookings">,
) {
  const weekday = getWeekdayFromDayStart(dayStartTs);

  const workingHours = await ctx.db
    .query("employeeWorkingHours")
    .withIndex("by_employee_weekday", (q) =>
      q.eq("employeeId", employeeId).eq("weekday", weekday),
    )
    .collect();
  const workingHour = workingHours.find(
    (row) => row.salonId === salonId && !row.isOff,
  );
  if (!workingHour) {
    return null;
  }

  const absenceCandidates = await ctx.db
    .query("employeeAbsences")
    .withIndex("by_employee_start", (q) =>
      q.eq("employeeId", employeeId).lt("startAt", dayEndTs),
    )
    .collect();
  const absences = absenceCandidates.filter((absence) =>
    overlaps(absence.startAt, absence.endAt, dayStartTs, dayEndTs),
  );

  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_employee_start", (q) =>
      q
        .eq("employeeId", employeeId)
        .gte("startAt", dayStartTs)
        .lt("startAt", dayEndTs),
    )
    .collect();
  const occupied = bookings.filter((booking) =>
    activeBookingStatuses.has(booking.status) &&
    (ignoreBookingId ? booking._id !== ignoreBookingId : true),
  );

  return {
    workingHour,
    absences,
    occupied,
  };
}

function getPotentialSlots(args: {
  stepMinutes: number;
  availableFromTs: number;
  availableToTs: number;
  totalServiceMinutes: number;
}) {
  const slots: Array<{ startAt: number; endAt: number }> = [];
  const stepMs = args.stepMinutes * 60_000;
  const durationMs = args.totalServiceMinutes * 60_000;
  for (
    let cursor = args.availableFromTs;
    cursor + durationMs <= args.availableToTs;
    cursor += stepMs
  ) {
    slots.push({
      startAt: cursor,
      endAt: cursor + durationMs,
    });
  }
  return slots;
}

type EmployeeSlotResult = {
  employeeId: Id<"employees">;
  startAt: number;
  endAt: number;
};

async function computeSalonSlots(
  ctx: Ctx,
  args: {
    salonId: Id<"salons">;
    serviceId: Id<"services">;
    dayStartTs: number;
    dayEndTs: number;
    employeeId?: Id<"employees">;
    stepMinutes?: number;
  },
): Promise<EmployeeSlotResult[]> {
  const service = await ctx.db.get(args.serviceId);
  if (!service || service.salonId !== args.salonId || !service.isActive) {
    return [];
  }

  const openingHoursForDay = await ctx.db
    .query("salonOpeningHours")
    .withIndex("by_salon_weekday", (q) =>
      q
        .eq("salonId", args.salonId)
        .eq("weekday", getWeekdayFromDayStart(args.dayStartTs)),
    )
    .unique();

  if (!openingHoursForDay || openingHoursForDay.isClosed) {
    return [];
  }

  const salonOpenTs = applyTimeToTimestamp(
    args.dayStartTs,
    openingHoursForDay.opensAt,
  );
  const salonCloseTs = applyTimeToTimestamp(
    args.dayStartTs,
    openingHoursForDay.closesAt,
  );
  const stepMinutes = Math.max(5, args.stepMinutes ?? 15);
  const totalServiceMinutes =
    service.durationMinutes +
    service.bufferBeforeMinutes +
    service.bufferAfterMinutes;

  let employeeIds: Id<"employees">[] = [];
  if (args.employeeId) {
    employeeIds = [args.employeeId];
  } else {
    const assignments = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();
    employeeIds = assignments
      .filter((item) => item.isActive)
      .map((item) => item.employeeId);
  }

  const output: EmployeeSlotResult[] = [];
  for (const employeeId of employeeIds) {
    const dayContext = await getEmployeeDayContext(
      ctx,
      employeeId,
      args.salonId,
      args.dayStartTs,
      args.dayEndTs,
    );
    if (!dayContext) {
      continue;
    }

    const employeeStartTs = applyTimeToTimestamp(
      args.dayStartTs,
      dayContext.workingHour.startAt,
    );
    const employeeEndTs = applyTimeToTimestamp(
      args.dayStartTs,
      dayContext.workingHour.endAt,
    );
    const availableFromTs = Math.max(salonOpenTs, employeeStartTs);
    const availableToTs = Math.min(salonCloseTs, employeeEndTs);

    const candidateSlots = getPotentialSlots({
      stepMinutes,
      availableFromTs,
      availableToTs,
      totalServiceMinutes,
    });

    for (const slot of candidateSlots) {
      const collidesWithAbsence = dayContext.absences.some((absence) =>
        overlaps(slot.startAt, slot.endAt, absence.startAt, absence.endAt),
      );
      if (collidesWithAbsence) {
        continue;
      }
      const collidesWithBooking = dayContext.occupied.some((booking) =>
        overlaps(slot.startAt, slot.endAt, booking.startAt, booking.endAt),
      );
      if (collidesWithBooking) {
        continue;
      }
      output.push({
        employeeId,
        startAt: slot.startAt,
        endAt: slot.endAt,
      });
    }
  }

  return output.sort((a, b) => a.startAt - b.startAt);
}

export const listAvailableSlotsForSalon = query({
  args: {
    salonId: v.id("salons"),
    serviceId: v.id("services"),
    dayStartTs: v.number(),
    dayEndTs: v.number(),
    employeeId: v.optional(v.id("employees")),
    stepMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EmployeeSlotResult[]> => {
    return await computeSalonSlots(ctx, args);
  },
});

export const listAvailableSlotsAllSalons = query({
  args: {
    serviceId: v.id("services"),
    dayStartTs: v.number(),
    dayEndTs: v.number(),
    employeeId: v.optional(v.id("employees")),
    stepMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service || !service.isActive) {
      return [];
    }

    const slots = await computeSalonSlots(ctx, {
      salonId: service.salonId,
      serviceId: args.serviceId,
      dayStartTs: args.dayStartTs,
      dayEndTs: args.dayEndTs,
      employeeId: args.employeeId,
      stepMinutes: args.stepMinutes,
    });

    return slots.map((slot) => ({
      salonId: service.salonId,
      ...slot,
    }));
  },
});

export const createBooking = mutation({
  args: {
    salonId: v.id("salons"),
    employeeId: v.id("employees"),
    serviceId: v.id("services"),
    startAt: v.number(),
    customerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);

    const service = await ctx.db.get(args.serviceId);
    if (!service || !service.isActive || service.salonId !== args.salonId) {
      throw new Error("Behandlingen er ikke tilgængelig i den valgte salon.");
    }

    const assignment = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_salon_employee", (q) =>
        q.eq("salonId", args.salonId).eq("employeeId", args.employeeId),
      )
      .unique();
    if (!assignment || !assignment.isActive) {
      throw new Error("Frisøren er ikke aktiv i den valgte salon.");
    }

    const category = await ctx.db.get(service.categoryId);
    if (!category) {
      throw new Error("Kategori mangler for service.");
    }

    const totalMinutes =
      service.durationMinutes +
      service.bufferBeforeMinutes +
      service.bufferAfterMinutes;
    const endAt = args.startAt + totalMinutes * 60_000;

    const { dayStart, dayEnd } = getBusinessDayBounds(args.startAt);

    const dayContext = await getEmployeeDayContext(
      ctx,
      args.employeeId,
      args.salonId,
      dayStart,
      dayEnd,
    );
    if (!dayContext) {
      throw new Error("Frisøren har ikke arbejdstid denne dag.");
    }

    const hasAbsence = dayContext.absences.some((absence) =>
      overlaps(args.startAt, endAt, absence.startAt, absence.endAt),
    );
    if (hasAbsence) {
      throw new Error("Frisøren er ikke tilgængelig i dette tidsrum.");
    }

    const hasConflict = dayContext.occupied.some((booking) =>
      overlaps(args.startAt, endAt, booking.startAt, booking.endAt),
    );
    if (hasConflict) {
      throw new Error("Tiden er allerede booket.");
    }

    const now = Date.now();
    const bookingId = await ctx.db.insert("bookings", {
      customerAuthUserId: authUser._id,
      salonId: args.salonId,
      employeeId: args.employeeId,
      serviceId: args.serviceId,
      categoryId: service.categoryId,
      serviceNameSnapshot: service.name,
      durationMinutesSnapshot: service.durationMinutes,
      priceDkkSnapshot: service.priceDkk,
      startAt: args.startAt,
      endAt,
      status: "booked",
      customerNote: args.customerNote,
      createdAt: now,
      updatedAt: now,
    });

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        preferredSalonId: args.salonId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        authUserId: authUser._id,
        fullName: authUser.name?.trim() || "Cut&Go kunde",
        email:
          typeof authUser.email === "string" && authUser.email.trim().length > 0
            ? authUser.email.trim()
            : undefined,
        phone: undefined,
        preferredSalonId: args.salonId,
        defaultLatitude: undefined,
        defaultLongitude: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    return bookingId;
  },
});

async function canManageBooking(
  ctx: Ctx,
  booking: Doc<"bookings">,
  authUserId: string,
) {
  if (booking.customerAuthUserId === authUserId) {
    return { allowed: true, mode: "customer" as const };
  }

  const appRole = await getAppRole(ctx, authUserId);
  if (appRole === "admin") {
    return { allowed: true, mode: "salon" as const };
  }

  const employee = await getEmployeeByAuthUserId(ctx, authUserId);
  if (!employee) {
    return { allowed: false, mode: "customer" as const };
  }

  const assignment = await ctx.db
    .query("employeeSalonRoles")
    .withIndex("by_salon_employee", (q) =>
      q.eq("salonId", booking.salonId).eq("employeeId", employee._id),
    )
    .unique();

  if (!assignment || !assignment.isActive) {
    return { allowed: false, mode: "customer" as const };
  }

  return { allowed: true, mode: "salon" as const };
}

async function getBookingOverviewItem(ctx: QueryCtx, booking: Doc<"bookings">) {
  const salon = await ctx.db.get(booking.salonId);
  const employee = await ctx.db.get(booking.employeeId);

  return {
    id: booking._id,
    serviceName: booking.serviceNameSnapshot,
    salonName: salon?.name ?? "Ukendt salon",
    stylistName: employee?.fullName ?? "Ukendt medarbejder",
    startsAt: new Date(booking.startAt).toISOString(),
    durationMinutes: booking.durationMinutesSnapshot,
    address: salon
      ? `${salon.addressLine1}, ${salon.postalCode} ${salon.city}`
      : "Adresse ikke fundet",
    latitude: salon?.latitude,
    longitude: salon?.longitude,
    status: booking.status,
  };
}

export const cancelBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking findes ikke.");
    }
    if (!activeBookingStatuses.has(booking.status)) {
      throw new Error("Kun aktive bookinger kan aflyses.");
    }

    const access = await canManageBooking(ctx, booking, authUser._id);
    if (!access.allowed) {
      throw new Error("Du har ikke adgang til at aflyse denne booking.");
    }

    const now = Date.now();
    await ctx.db.patch(args.bookingId, {
      status:
        access.mode === "customer"
          ? "cancelled_by_customer"
          : "cancelled_by_salon",
      cancellationReason: args.reason,
      cancelledAt: now,
      cancelledByAuthUserId: authUser._id,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const confirmBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking findes ikke.");
    }
    if (booking.status !== "booked") {
      throw new Error("Kun bookinger med status 'booked' kan bekræftes.");
    }

    await requireSalonAccess(ctx, booking.salonId, [
      "owner",
      "manager",
      "stylist",
      "assistant",
    ]);
    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const markCompleted = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking findes ikke.");
    }
    if (!activeBookingStatuses.has(booking.status)) {
      throw new Error("Kun aktive bookinger kan markeres færdige.");
    }

    await requireSalonAccess(ctx, booking.salonId, [
      "owner",
      "manager",
      "stylist",
      "assistant",
    ]);
    await ctx.db.patch(args.bookingId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const getMyCustomerBookings = query({
  args: {
    includePast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const now = Date.now();

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer_start", (q) =>
        q.eq("customerAuthUserId", authUser._id),
      )
      .collect();

    return bookings
      .filter((booking) =>
        (args.includePast ?? false) ? true : booking.endAt >= now,
      )
      .sort((a, b) => a.startAt - b.startAt);
  },
});

export const getMyOverviewBookings = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer_start", (q) =>
        q.eq("customerAuthUserId", authUser._id),
      )
      .collect();

    const hydrated = [];
    for (const booking of bookings) {
      hydrated.push(await getBookingOverviewItem(ctx, booking));
    }

    return hydrated.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  },
});

export const getViewerBookingDetail = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return null;
    }

    const access = await canManageBooking(ctx, booking, authUser._id);
    if (!access.allowed) {
      throw new Error("Du har ikke adgang til denne booking.");
    }

    const salon = await ctx.db.get(booking.salonId);
    const employee = await ctx.db.get(booking.employeeId);
    const photos = await ctx.db
      .query("appointmentPhotos")
      .withIndex("by_booking_type", (q) =>
        q.eq("bookingId", args.bookingId).eq("photoType", "reference"),
      )
      .collect();

    const referencePhotoUris = (
      await Promise.all(
        photos.map(async (photo) => await ctx.storage.getUrl(photo.storageId)),
      )
    ).filter((value): value is string => Boolean(value));

    const orderedReferenceUris: Array<string | null> = [null, null, null];
    const slotByCaption = new Map(
      referenceSlots.map((caption, index) => [caption, index]),
    );

    referencePhotoUris.forEach((uri, index) => {
      const photo = photos[index];
      if (!photo) {
        return;
      }

      const mappedSlot =
        photo.caption &&
        slotByCaption.has(photo.caption as (typeof referenceSlots)[number])
          ? slotByCaption.get(photo.caption as (typeof referenceSlots)[number])
          : undefined;

      if (
        mappedSlot !== undefined &&
        mappedSlot >= 0 &&
        mappedSlot < orderedReferenceUris.length
      ) {
        orderedReferenceUris[mappedSlot] = uri;
        return;
      }

      const firstEmpty = orderedReferenceUris.findIndex((value) => !value);
      if (firstEmpty >= 0) {
        orderedReferenceUris[firstEmpty] = uri;
      }
    });

    return {
      id: booking._id,
      serviceName: booking.serviceNameSnapshot,
      salonName: salon?.name ?? "Ukendt salon",
      stylistName: employee?.fullName ?? "Ukendt medarbejder",
      startsAt: booking.startAt,
      endAt: booking.endAt,
      durationMinutes: booking.durationMinutesSnapshot,
      address: salon
        ? `${salon.addressLine1}, ${salon.postalCode} ${salon.city}`
        : "Adresse ikke fundet",
      latitude: salon?.latitude,
      longitude: salon?.longitude,
      status: booking.status,
      customerNote: booking.customerNote ?? null,
      referencePhotoUris: orderedReferenceUris,
    };
  },
});

export const getMyEmployeeBookings = query({
  args: {
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
    if (!employee) {
      return [];
    }

    const fromTs = args.fromTs ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    const toTs = args.toTs ?? Date.now() + 60 * 24 * 60 * 60 * 1000;
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_employee_start", (q) =>
        q
          .eq("employeeId", employee._id)
          .gte("startAt", fromTs)
          .lt("startAt", toTs),
      )
      .collect();

    return bookings.sort((a, b) => a.startAt - b.startAt);
  },
});

export const getMyEmployeeSchedule = query({
  args: {
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
    if (!employee) {
      return [];
    }

    const fromTs = args.fromTs ?? Date.now() - 24 * 60 * 60 * 1000;
    const toTs = args.toTs ?? Date.now() + 30 * 24 * 60 * 60 * 1000;

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_employee_start", (q) =>
        q
          .eq("employeeId", employee._id)
          .gte("startAt", fromTs)
          .lt("startAt", toTs),
      )
      .collect();

    const profileNameByAuthUserId = new Map<string, string>();

    const output = [];
    for (const booking of bookings) {
      const salon = await ctx.db.get(booking.salonId);

      let customerName = profileNameByAuthUserId.get(booking.customerAuthUserId);
      if (!customerName) {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_auth_user_id", (q) =>
            q.eq("authUserId", booking.customerAuthUserId),
          )
          .unique();
        customerName = profile?.fullName ?? "Kunde";
        profileNameByAuthUserId.set(booking.customerAuthUserId, customerName);
      }

      output.push({
        bookingId: booking._id,
        status: booking.status,
        salonId: booking.salonId,
        salonName: salon?.name ?? "Ukendt salon",
        serviceId: booking.serviceId,
        serviceName: booking.serviceNameSnapshot,
        customerName,
        startAt: booking.startAt,
        endAt: booking.endAt,
        customerNote: booking.customerNote ?? null,
      });
    }

    return output.sort((a, b) => a.startAt - b.startAt);
  },
});

export const rescheduleMyBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    newStartAt: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
    if (!employee) {
      throw new Error("Ingen medarbejderprofil fundet for brugeren.");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking findes ikke.");
    }
    if (booking.employeeId !== employee._id) {
      throw new Error("Du kan kun redigere dine egne bookinger.");
    }
    if (!activeBookingStatuses.has(booking.status)) {
      throw new Error("Kun aktive bookinger kan flyttes.");
    }

    const service = await ctx.db.get(booking.serviceId);
    if (!service || !service.isActive) {
      throw new Error("Service er ikke længere aktiv.");
    }

    const totalMinutes =
      service.durationMinutes +
      service.bufferBeforeMinutes +
      service.bufferAfterMinutes;
    const newEndAt = args.newStartAt + totalMinutes * 60_000;

    const { dayStart, dayEnd } = getBusinessDayBounds(args.newStartAt);

    const dayContext = await getEmployeeDayContext(
      ctx,
      employee._id,
      booking.salonId,
      dayStart,
      dayEnd,
      booking._id,
    );
    if (!dayContext) {
      throw new Error("Du har ikke arbejdstid på den valgte dag.");
    }

    const openingHoursForDay = await ctx.db
      .query("salonOpeningHours")
      .withIndex("by_salon_weekday", (q) =>
        q
          .eq("salonId", booking.salonId)
          .eq("weekday", getWeekdayFromDayStart(dayStart)),
      )
      .unique();
    if (!openingHoursForDay || openingHoursForDay.isClosed) {
      throw new Error("Salonen er lukket på den valgte dag.");
    }

    const salonOpenTs = applyTimeToTimestamp(dayStart, openingHoursForDay.opensAt);
    const salonCloseTs = applyTimeToTimestamp(
      dayStart,
      openingHoursForDay.closesAt,
    );
    const employeeStartTs = applyTimeToTimestamp(
      dayStart,
      dayContext.workingHour.startAt,
    );
    const employeeEndTs = applyTimeToTimestamp(
      dayStart,
      dayContext.workingHour.endAt,
    );
    const availableFromTs = Math.max(salonOpenTs, employeeStartTs);
    const availableToTs = Math.min(salonCloseTs, employeeEndTs);

    if (args.newStartAt < availableFromTs || newEndAt > availableToTs) {
      throw new Error("Tiden ligger uden for åbningstid eller arbejdstid.");
    }

    const hasAbsence = dayContext.absences.some((absence) =>
      overlaps(args.newStartAt, newEndAt, absence.startAt, absence.endAt),
    );
    if (hasAbsence) {
      throw new Error("Du er registreret fraværende i dette tidsrum.");
    }

    const hasConflict = dayContext.occupied.some((otherBooking) =>
      overlaps(args.newStartAt, newEndAt, otherBooking.startAt, otherBooking.endAt),
    );
    if (hasConflict) {
      throw new Error("Der er allerede en booking i dette tidsrum.");
    }

    await ctx.db.patch(booking._id, {
      startAt: args.newStartAt,
      endAt: newEndAt,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
