import { v } from "convex/values";
import { query } from "../../../_generated/server";
import {
  getEmployeeByAuthUserId,
  requireAppRole,
  requireAuthUser,
  requireSalonAccess,
} from "../../security/authz";
import { activeBookingStatuses } from "./shared";

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

    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "da-DK"));
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

    const activeAssignments = assignments.filter(
      (assignment) => assignment.isActive,
    );
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

    return output.sort((a, b) =>
      a.salonName.localeCompare(b.salonName, "da-DK"),
    );
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
