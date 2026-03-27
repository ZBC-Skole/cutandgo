import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { getAppRole, getEmployeeByAuthUserId } from "../../security/authz";

export const activeBookingStatuses = new Set(["booked", "confirmed"]);
export const referenceSlots = ["Forfra", "Side", "Bagfra"] as const;

export type Ctx = QueryCtx | MutationCtx;

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

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
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

export function applyTimeToTimestamp(dayStartTs: number, time: string) {
  const minutes = parseTimeToMinutes(time);
  return dayStartTs + minutes * 60_000;
}

export function getWeekdayFromDayStart(dayStartTs: number) {
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

export function getBusinessDayBounds(timestamp: number) {
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

export async function getEmployeeDayContext(
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
  const occupied = bookings.filter(
    (booking) =>
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

export type EmployeeSlotResult = {
  employeeId: Id<"employees">;
  startAt: number;
  endAt: number;
};

export async function computeSalonSlots(
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

export async function canManageBooking(
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

export async function getBookingOverviewItem(ctx: QueryCtx, booking: Doc<"bookings">) {
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
