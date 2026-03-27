import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getAppRole, getEmployeeByAuthUserId, requireAuthUser, requireSalonAccess } from "./lib/authz";

type Ctx = QueryCtx | MutationCtx;

export const createUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

async function canAccessBooking(ctx: Ctx, bookingId: Id<"bookings">, authUserId: string) {
  const booking = await ctx.db.get(bookingId);
  if (!booking) {
    return { allowed: false, booking: null };
  }

  if (booking.customerAuthUserId === authUserId) {
    return { allowed: true, booking };
  }

  const appRole = await getAppRole(ctx, authUserId);
  if (appRole === "admin") {
    return { allowed: true, booking };
  }

  const employee = await getEmployeeByAuthUserId(ctx, authUserId);
  if (!employee) {
    return { allowed: false, booking };
  }

  const assignment = await ctx.db
    .query("employeeSalonRoles")
    .withIndex("by_salon_employee", (q) => q.eq("salonId", booking.salonId).eq("employeeId", employee._id))
    .unique();

  return { allowed: Boolean(assignment?.isActive), booking };
}

export const attachBookingPhoto = mutation({
  args: {
    bookingId: v.id("bookings"),
    storageId: v.id("_storage"),
    photoType: v.union(v.literal("before"), v.literal("after"), v.literal("reference")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const access = await canAccessBooking(ctx, args.bookingId, authUser._id);
    if (!access.allowed || !access.booking) {
      throw new Error("Du har ikke adgang til at tilføje billeder til bookingen.");
    }

    if (args.photoType === "reference") {
      const existingReferences = await ctx.db
        .query("appointmentPhotos")
        .withIndex("by_booking_type", (q) =>
          q.eq("bookingId", args.bookingId).eq("photoType", "reference"),
        )
        .collect();

      const existingForCaption =
        args.caption
          ? existingReferences.find((item) => item.caption === args.caption)
          : null;

      if (existingForCaption) {
        await ctx.db.patch(existingForCaption._id, {
          storageId: args.storageId,
          uploadedByAuthUserId: authUser._id,
          createdAt: Date.now(),
        });
        return existingForCaption._id;
      }

      if (existingReferences.length >= 3) {
        throw new Error(
          "Du kan maks gemme 3 referencebilleder. Udskift et eksisterende billede.",
        );
      }
    }

    return await ctx.db.insert("appointmentPhotos", {
      bookingId: args.bookingId,
      storageId: args.storageId,
      photoType: args.photoType,
      caption: args.caption,
      uploadedByAuthUserId: authUser._id,
      createdAt: Date.now(),
    });
  },
});

export const listBookingPhotos = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const access = await canAccessBooking(ctx, args.bookingId, authUser._id);
    if (!access.allowed || !access.booking) {
      throw new Error("Du har ikke adgang til billederne for denne booking.");
    }

    return await ctx.db
      .query("appointmentPhotos")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();
  },
});

export const attachSalonPhoto = mutation({
  args: {
    salonId: v.id("salons"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    return await ctx.db.insert("salonPhotos", {
      salonId: args.salonId,
      storageId: args.storageId,
      caption: args.caption,
      uploadedByAuthUserId: authUser._id,
      createdAt: Date.now(),
    });
  },
});

export const listSalonPhotos = query({
  args: {
    salonId: v.id("salons"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("salonPhotos")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();
  },
});
