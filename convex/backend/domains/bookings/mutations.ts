import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import {
  getEmployeeByAuthUserId,
  requireAuthUser,
  requireSalonAccess,
} from "../../security/authz";
import {
  activeBookingStatuses,
  applyTimeToTimestamp,
  canManageBooking,
  getBusinessDayBounds,
  getEmployeeDayContext,
  getWeekdayFromDayStart,
  overlaps,
} from "./shared";

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

    const salonOpenTs = applyTimeToTimestamp(
      dayStart,
      openingHoursForDay.opensAt,
    );
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
      overlaps(
        args.newStartAt,
        newEndAt,
        otherBooking.startAt,
        otherBooking.endAt,
      ),
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
