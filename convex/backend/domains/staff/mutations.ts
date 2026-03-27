import { v } from "convex/values";
import { mutation } from "../../../_generated/server";
import {
  getEmployeeByAuthUserId,
  requireAppRole,
  requireAuthUser,
  requireSalonAccess,
} from "../../security/authz";
import { activeBookingStatuses, overlaps, syncEmployeesFromWorkerRoles } from "./shared";

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

export const syncEmployeesFromWorkerRolesAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAppRole(ctx, ["admin"]);

    const before = await ctx.db.query("employees").collect();
    await syncEmployeesFromWorkerRoles(ctx);
    const after = await ctx.db.query("employees").collect();

    return { createdCount: Math.max(0, after.length - before.length) };
  },
});

export const assignEmployeeToSalon = mutation({
  args: {
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("stylist"),
      v.literal("assistant"),
    ),
    canManageSchedule: v.optional(v.boolean()),
    canManageProducts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const existing = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_salon_employee", (q) =>
        q.eq("salonId", args.salonId).eq("employeeId", args.employeeId),
      )
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

export const updateEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAppRole(ctx, ["admin"]);

    const existing = await ctx.db.get(args.employeeId);
    if (!existing) {
      throw new Error("Medarbejderen findes ikke.");
    }

    await ctx.db.patch(args.employeeId, {
      fullName: args.fullName,
      phone: args.phone,
      email: args.email,
      title: args.title,
      bio: args.bio,
      avatarStorageId: args.avatarStorageId,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return args.employeeId;
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

export const reportMySickLeave = mutation({
  args: {
    salonId: v.id("salons"),
    startAt: v.number(),
    endAt: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
    if (!employee) {
      throw new Error("Ingen medarbejderprofil fundet.");
    }

    if (args.endAt <= args.startAt) {
      throw new Error("Sluttid skal være efter starttid.");
    }

    const assignment = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_salon_employee", (q) =>
        q.eq("salonId", args.salonId).eq("employeeId", employee._id),
      )
      .unique();
    if (!assignment || !assignment.isActive) {
      throw new Error("Du er ikke aktiv i den valgte salon.");
    }

    const now = Date.now();
    const absenceId = await ctx.db.insert("employeeAbsences", {
      employeeId: employee._id,
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
        q.eq("employeeId", employee._id).lt("startAt", args.endAt),
      )
      .collect();

    let cancelledCount = 0;
    for (const booking of bookings) {
      if (booking.salonId !== args.salonId) {
        continue;
      }
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
      updatedAt: now,
    });

    return { absenceId, cancelledCount };
  },
});

export const resolveMySickLeave = mutation({
  args: {
    salonId: v.optional(v.id("salons")),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
    if (!employee) {
      throw new Error("Ingen medarbejderprofil fundet.");
    }

    const now = Date.now();
    const absences = await ctx.db
      .query("employeeAbsences")
      .withIndex("by_employee_start", (q) => q.eq("employeeId", employee._id))
      .collect();

    const toResolve = absences.filter((absence) => {
      if (absence.status !== "active") {
        return false;
      }
      if (args.salonId && absence.salonId !== args.salonId) {
        return false;
      }
      return absence.endAt > now;
    });

    for (const absence of toResolve) {
      const resolvedEndAt = absence.startAt > now ? absence.startAt : now;
      await ctx.db.patch(absence._id, {
        status: "resolved",
        endAt: resolvedEndAt,
        updatedAt: now,
      });
    }

    return { resolvedCount: toResolve.length };
  },
});
