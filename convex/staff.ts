import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  getEmployeeByAuthUserId,
  requireAppRole,
  requireAuthUser,
  requireSalonAccess,
} from "./lib/authz";

const activeBookingStatuses = new Set(["booked", "confirmed"]);

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

async function syncEmployeesFromWorkerRoles(ctx: MutationCtx) {
  const roleDocs = await ctx.db.query("userRoles").collect();
  const workerRoles = roleDocs.filter(
    (roleDoc) => roleDoc.role === "medarbejder",
  );

  const now = Date.now();
  for (const roleDoc of workerRoles) {
    const existing = await ctx.db
      .query("employees")
      .withIndex("by_auth_user_id", (q) =>
        q.eq("authUserId", roleDoc.authUserId),
      )
      .unique();
    if (existing) {
      continue;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user_id", (q) =>
        q.eq("authUserId", roleDoc.authUserId),
      )
      .unique();

    await ctx.db.insert("employees", {
      authUserId: roleDoc.authUserId,
      fullName:
        profile?.fullName?.trim() ||
        `Medarbejder ${String(roleDoc.authUserId).slice(-6)}`,
      phone: profile?.phone,
      email: profile?.email,
      title: "Medarbejder",
      bio: undefined,
      avatarStorageId: undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }
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

export const listEmployees = query({
  args: {},
  handler: async (ctx) => {
    const employees = await ctx.db.query("employees").collect();
    return employees.sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "da-DK"),
    );
  },
});

export const listEmployeesWithAssignments = query({
  args: {},
  handler: async (ctx) => {
    await requireAppRole(ctx, ["admin"]);

    const employees = await ctx.db.query("employees").collect();
    const assignments = await ctx.db.query("employeeSalonRoles").collect();
    const salons = await ctx.db
      .query("salons")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    const salonById = new Map(salons.map((salon) => [salon._id, salon]));

    const rows = await Promise.all(
      employees.map(async (employee) => {
        const employeeAssignments = assignments
          .filter((assignment) => assignment.employeeId === employee._id)
          .map((assignment) => ({
            ...assignment,
            salonName:
              salonById.get(assignment.salonId)?.name ?? "Ukendt salon",
            salonCity: salonById.get(assignment.salonId)?.city ?? null,
          }))
          .sort((a, b) => a.salonName.localeCompare(b.salonName, "da-DK"));

        const avatarUrl = employee.avatarStorageId
          ? await ctx.storage.getUrl(employee.avatarStorageId)
          : null;

        return {
          ...employee,
          avatarUrl,
          assignments: employeeAssignments,
          activeSalonCount: employeeAssignments.filter((item) => item.isActive)
            .length,
        };
      }),
    );

    return rows
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "da-DK"));
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

export const getEmployeeAdminDetail = query({
  args: {
    employeeId: v.id("employees"),
  },
  handler: async (ctx, args) => {
    await requireAppRole(ctx, ["admin"]);

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      return null;
    }

    const assignments = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();

    const salons = await ctx.db
      .query("salons")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();
    const salonById = new Map(salons.map((salon) => [salon._id, salon]));

    const workingHours = await ctx.db
      .query("employeeWorkingHours")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();

    const avatarUrl = employee.avatarStorageId
      ? await ctx.storage.getUrl(employee.avatarStorageId)
      : null;

    return {
      employee: {
        ...employee,
        avatarUrl,
      },
      assignments: assignments
        .map((assignment) => ({
          ...assignment,
          salonName: salonById.get(assignment.salonId)?.name ?? "Ukendt salon",
          workingHours: workingHours
            .filter((row) => row.salonId === assignment.salonId)
            .sort((a, b) => a.weekday - b.weekday),
        }))
        .sort((a, b) => a.salonName.localeCompare(b.salonName, "da-DK")),
    };
  },
});

export const listSalonEmployees = query({
  args: {
    salonId: v.id("salons"),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, [
      "owner",
      "manager",
      "stylist",
      "assistant",
    ]);

    const assignments = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();

    const results = [];
    for (const assignment of assignments) {
      const employee = await ctx.db.get(assignment.employeeId);
      if (!employee) {
        continue;
      }
      results.push({
        assignment,
        employee,
      });
    }
    return results;
  },
});

export const listPublicSalonEmployees = query({
  args: {
    salonId: v.id("salons"),
  },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_salon", (q) => q.eq("salonId", args.salonId))
      .collect();

    const activeAssignments = assignments.filter(
      (assignment) => assignment.isActive,
    );
    const results = [];

    for (const assignment of activeAssignments) {
      const employee = await ctx.db.get(assignment.employeeId);
      if (!employee || !employee.isActive) {
        continue;
      }

      results.push({
        _id: employee._id,
        fullName: employee.fullName,
        title: employee.title ?? assignment.role,
        role: assignment.role,
      });
    }

    return results.sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "da-DK"),
    );
  },
});

export const getMyActiveSalons = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);
    const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
    if (!employee) {
      return [];
    }

    const assignments = await ctx.db
      .query("employeeSalonRoles")
      .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
      .collect();

    const activeAssignments = assignments.filter((assignment) => assignment.isActive);
    const output = [];
    for (const assignment of activeAssignments) {
      const salon = await ctx.db.get(assignment.salonId);
      if (!salon || !salon.isActive) {
        continue;
      }

      output.push({
        salonId: salon._id,
        salonName: salon.name,
        city: salon.city,
        role: assignment.role,
      });
    }

    return output.sort((a, b) => a.salonName.localeCompare(b.salonName, "da-DK"));
  },
});

export const getWorkingHours = query({
  args: {
    employeeId: v.id("employees"),
    salonId: v.id("salons"),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, [
      "owner",
      "manager",
      "stylist",
      "assistant",
    ]);

    const rows = await ctx.db
      .query("employeeWorkingHours")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();

    return rows
      .filter((row) => row.salonId === args.salonId)
      .sort((a, b) => a.weekday - b.weekday);
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
        args.canManageSchedule ??
        (args.role === "owner" || args.role === "manager"),
      canManageProducts:
        args.canManageProducts ??
        (args.role === "owner" || args.role === "manager"),
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
      .withIndex("by_employee_start", (q) =>
        q.eq("employeeId", employee._id).gte("startAt", fromTs),
      )
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
        q
          .eq("employeeId", args.employeeId)
          .gte("startAt", args.fromTs)
          .lt("startAt", args.toTs),
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
        q
          .eq("employeeId", args.employeeId)
          .gte("startAt", args.startAt)
          .lt("startAt", args.endAt),
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
