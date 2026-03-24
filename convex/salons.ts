import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAppRole } from "./lib/authz";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("salons")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getById = query({
  args: {
    salonId: v.id("salons"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.salonId);
  },
});

export const getOpeningHours = query({
  args: {
    salonId: v.id("salons"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("salonOpeningHours")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();
  },
});

export const findNearest = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const salons = await ctx.db
      .query("salons")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();
    if (salons.length === 0) {
      return null;
    }

    let nearest = salons[0];
    let nearestDistance = distanceInKm(args.latitude, args.longitude, nearest.latitude, nearest.longitude);
    for (const salon of salons.slice(1)) {
      const distance = distanceInKm(args.latitude, args.longitude, salon.latitude, salon.longitude);
      if (distance < nearestDistance) {
        nearest = salon;
        nearestDistance = distance;
      }
    }

    return {
      ...nearest,
      distanceKm: Number(nearestDistance.toFixed(2)),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    postalCode: v.string(),
    city: v.string(),
    countryCode: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAppRole(ctx, ["admin"]);

    const now = Date.now();
    return await ctx.db.insert("salons", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setOpeningHours = mutation({
  args: {
    salonId: v.id("salons"),
    entries: v.array(
      v.object({
        weekday: v.number(),
        opensAt: v.string(),
        closesAt: v.string(),
        isClosed: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAppRole(ctx, ["admin"]);

    const existing = await ctx.db
      .query("salonOpeningHours")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const now = Date.now();
    for (const entry of args.entries) {
      if (entry.weekday < 0 || entry.weekday > 6) {
        throw new Error("weekday skal være mellem 0 og 6.");
      }
      await ctx.db.insert("salonOpeningHours", {
        salonId: args.salonId,
        weekday: entry.weekday,
        opensAt: entry.opensAt,
        closesAt: entry.closesAt,
        isClosed: entry.isClosed ?? false,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

