import { v } from "convex/values";
import { query } from "../../../_generated/server";
import { getEmployeeByAuthUserId, requireAuthUser } from "../../security/authz";
import {
  canManageBooking,
  computeSalonSlots,
  getBookingOverviewItem,
  referenceSlots,
  type EmployeeSlotResult,
} from "./shared";

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
      .filter((booking) => ((args.includePast ?? false) ? true : booking.endAt >= now))
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
        q.eq("employeeId", employee._id).gte("startAt", fromTs).lt("startAt", toTs),
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
        q.eq("employeeId", employee._id).gte("startAt", fromTs).lt("startAt", toTs),
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
