import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getEmployeeByAuthUserId, requireAppRole, requireAuthUser, requireSalonAccess } from "./lib/authz";

const activeBookingStatuses = new Set(["booked", "confirmed"]);

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export const createEmployee = mutation({
  args: {
    fullName: v.string(),
    authUserId: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAppRole(ctx, ["admin"]);

    const now = Date.now();
    return await ctx.db.insert("employees", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const assignEmployeeToSalon = mutation({
  args: {
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("stylist"), v.literal("assistant")),
    canManageSchedule: v.optional(v.boolean()),
    canManageProducts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const existing = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_salon_employee", (q) => q.eq("salonId", args.salonId).eq("employeeId", args.employeeId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        canManageSchedule: args.canManageSchedule ?? existing.canManageSchedule,
        canManageProducts: args.canManageProducts ?? existing.canManageProducts,
        isActive: true,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("employeeSalonRoles", {
      employeeId: args.employeeId,
      salonId: args.salonId,
      role: args.role,
      canManageSchedule:
        args.canManageSchedule ?? (args.role === "owner" || args.role === "manager"),
      canManageProducts:
        args.canManageProducts ?? (args.role === "owner" || args.role === "manager"),
      isActive: true,
      hiredAt: now,
      updatedAt: now,
    });
  },
});

export const setWorkingHours = mutation({
  args: {
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
    entries: v.array(
      v.object({
        weekday: v.number(),
        startAt: v.string(),
        endAt: v.string(),
        isOff: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const existing = await ctx.db
      .query("employeeWorkingHours")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();

    for (const row of existing) {
      if (row.salonId === args.salonId) {
        await ctx.db.delete(row._id);
      }
    }

    const now = Date.now();
    for (const entry of args.entries) {
      if (entry.weekday < 0 || entry.weekday > 6) {
        throw new Error("weekday skal være mellem 0 og 6.");
      }

      await ctx.db.insert("employeeWorkingHours", {
        employeeId: args.employeeId,
        salonId: args.salonId,
        weekday: entry.weekday,
        startAt: entry.startAt,
        endAt: entry.endAt,
        isOff: entry.isOff ?? false,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const getMyNextCustomer = query({
  args: {
    fromTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
    if (!employee) {
      return null;
    }

    const fromTs = args.fromTs ?? Date.now();
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_employee_start", (q) => q.eq("employeeId", employee._id).gte("startAt", fromTs))
      .collect();

    const next = bookings
      .filter((item) => activeBookingStatuses.has(item.status))
      .sort((a, b) => a.startAt - b.startAt)[0];

    if (!next) {
      return null;
    }

    const salon = await ctx.db.get(next.salonId);
    return {
      ...next,
      salonName: salon?.name ?? null,
    };
  },
});

export const getEmployeeBookings = query({
  args: {
    employeeId: v.id("employees"),
    fromTs: v.number(),
    toTs: v.number(),
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_employee_start", (q) =>
        q.eq("employeeId", args.employeeId).gte("startAt", args.fromTs).lt("startAt", args.toTs),
      )
      .collect();
    return bookings.sort((a, b) => a.startAt - b.startAt);
  },
});

export const registerSickLeaveAndAutoCancel = mutation({
  args: {
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
    startAt: v.number(),
    endAt: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const now = Date.now();
    const absenceId = await ctx.db.insert("employeeAbsences", {
      employeeId: args.employeeId,
      salonId: args.salonId,
      startAt: args.startAt,
      endAt: args.endAt,
      reason: args.reason,
      status: "active",
      cancelledAppointmentsCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_employee_start", (q) =>
        q.eq("employeeId", args.employeeId).gte("startAt", args.startAt).lt("startAt", args.endAt),
      )
      .collect();

    let cancelledCount = 0;
    const authUser = await requireAuthUser(ctx);
    for (const booking of bookings) {
      if (!activeBookingStatuses.has(booking.status)) {
        continue;
      }
      if (!overlaps(booking.startAt, booking.endAt, args.startAt, args.endAt)) {
        continue;
      }

      cancelledCount += 1;
      await ctx.db.patch(booking._id, {
        status: "cancelled_by_salon",
        cancellationReason: args.reason ?? "Aflyst pga. sygdom",
        cancelledAt: now,
        cancelledByAuthUserId: authUser._id,
        updatedAt: now,
      });
    }

    await ctx.db.patch(absenceId, {
      cancelledAppointmentsCount: cancelledCount,
      updatedAt: Date.now(),
    });

    return { absenceId, cancelledCount };
  },
});
