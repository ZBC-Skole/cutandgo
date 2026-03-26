import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAppRole, requireSalonAccess } from "./lib/authz";

const periodKeyValidator = v.union(
  v.literal("7d"),
  v.literal("30d"),
  v.literal("90d"),
);

function getPeriodRange(periodKey: "7d" | "30d" | "90d") {
  const now = Date.now();
  const days = periodKey === "7d" ? 7 : periodKey === "30d" ? 30 : 90;
  return {
    fromTs: now - days * 24 * 60 * 60 * 1000,
    toTs: now,
  };
}

export const getSalonOverview = query({
  args: {
    salonId: v.id("salons"),
    fromTs: v.number(),
    toTs: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSalonAccess(ctx, args.salonId, ["owner", "manager"]);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_salon_start", (q) =>
        q
          .eq("salonId", args.salonId)
          .gte("startAt", args.fromTs)
          .lt("startAt", args.toTs),
      )
      .collect();

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(
      (item) => item.status === "completed",
    );
    const cancelledBookings = bookings.filter(
      (item) =>
        item.status === "cancelled_by_customer" ||
        item.status === "cancelled_by_salon",
    );
    const upcomingBookings = bookings.filter(
      (item) =>
        (item.status === "booked" || item.status === "confirmed") &&
        item.startAt >= Date.now(),
    );
    const revenueDkk = completedBookings.reduce(
      (sum, item) => sum + item.priceDkkSnapshot,
      0,
    );

    const perService = new Map<
      string,
      { serviceName: string; count: number; revenueDkk: number }
    >();
    for (const booking of completedBookings) {
      const current = perService.get(booking.serviceId) ?? {
        serviceName: booking.serviceNameSnapshot,
        count: 0,
        revenueDkk: 0,
      };
      current.count += 1;
      current.revenueDkk += booking.priceDkkSnapshot;
      perService.set(booking.serviceId, current);
    }

    const topServices = [...perService.values()].sort(
      (a, b) => b.count - a.count,
    );

    return {
      period: {
        fromTs: args.fromTs,
        toTs: args.toTs,
      },
      totals: {
        totalBookings,
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        upcomingBookings: upcomingBookings.length,
        revenueDkk,
      },
      topServices,
    };
  },
});

export const getAdminDashboard = query({
  args: {
    periodKey: periodKeyValidator,
    salonId: v.optional(v.id("salons")),
  },
  handler: async (ctx, args) => {
    await requireAppRole(ctx, ["admin"]);

    const activeSalons = await ctx.db
      .query("salons")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();
    const employees = await ctx.db.query("employees").collect();
    const assignments = await ctx.db.query("employeeSalonRoles").collect();
    const { fromTs, toTs } = getPeriodRange(args.periodKey);

    const scopedSalonIds = args.salonId
      ? new Set([args.salonId])
      : new Set(activeSalons.map((salon) => salon._id));

    const bookings = args.salonId
      ? await ctx.db
          .query("bookings")
          .withIndex("by_salon_start", (q) =>
            q
              .eq("salonId", args.salonId!)
              .gte("startAt", fromTs)
              .lt("startAt", toTs),
          )
          .collect()
      : (await ctx.db.query("bookings").collect()).filter(
          (booking) =>
            scopedSalonIds.has(booking.salonId) &&
            booking.startAt >= fromTs &&
            booking.startAt < toTs,
        );

    const completedBookings = bookings.filter(
      (item) => item.status === "completed",
    );
    const cancelledBookings = bookings.filter(
      (item) =>
        item.status === "cancelled_by_customer" ||
        item.status === "cancelled_by_salon",
    );
    const activeAssignments = assignments.filter(
      (assignment) =>
        assignment.isActive && scopedSalonIds.has(assignment.salonId),
    );
    const activeEmployeeIds = new Set(
      activeAssignments.map((assignment) => assignment.employeeId),
    );
    const activeEmployees = employees.filter(
      (employee) =>
        employee.isActive &&
        (args.salonId ? activeEmployeeIds.has(employee._id) : true),
    );

    const topServicesMap = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        count: number;
        revenueDkk: number;
      }
    >();

    for (const booking of completedBookings) {
      const current = topServicesMap.get(booking.serviceId) ?? {
        serviceId: booking.serviceId,
        serviceName: booking.serviceNameSnapshot,
        count: 0,
        revenueDkk: 0,
      };
      current.count += 1;
      current.revenueDkk += booking.priceDkkSnapshot;
      topServicesMap.set(booking.serviceId, current);
    }

    const bookingsBySalon = new Map<
      string,
      {
        totalBookings: number;
        completedBookings: number;
        cancelledBookings: number;
        revenueDkk: number;
      }
    >();

    for (const booking of bookings) {
      const current = bookingsBySalon.get(booking.salonId) ?? {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        revenueDkk: 0,
      };
      current.totalBookings += 1;
      if (booking.status === "completed") {
        current.completedBookings += 1;
        current.revenueDkk += booking.priceDkkSnapshot;
      }
      if (
        booking.status === "cancelled_by_customer" ||
        booking.status === "cancelled_by_salon"
      ) {
        current.cancelledBookings += 1;
      }
      bookingsBySalon.set(booking.salonId, current);
    }

    const snapshotSalons = activeSalons.filter((salon) =>
      args.salonId ? salon._id === args.salonId : true,
    );

    return {
      filters: {
        selectedPeriodKey: args.periodKey,
        selectedSalonId: args.salonId ?? null,
        salonOptions: activeSalons
          .sort((a, b) => a.name.localeCompare(b.name, "da-DK"))
          .map((salon) => ({
            _id: salon._id,
            name: salon.name,
            city: salon.city,
          })),
      },
      period: {
        fromTs,
        toTs,
      },
      totals: {
        salonCount: snapshotSalons.length,
        activeEmployeeCount: activeEmployees.length,
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        revenueDkk: completedBookings.reduce(
          (sum, item) => sum + item.priceDkkSnapshot,
          0,
        ),
      },
      topServices: [...topServicesMap.values()]
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return b.revenueDkk - a.revenueDkk;
        })
        .slice(0, 5),
      salonSnapshot: snapshotSalons
        .map((salon) => {
          const totals = bookingsBySalon.get(salon._id) ?? {
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            revenueDkk: 0,
          };
          const salonEmployeeCount = new Set(
            activeAssignments
              .filter((assignment) => assignment.salonId === salon._id)
              .map((assignment) => assignment.employeeId),
          ).size;

          return {
            salonId: salon._id,
            salonName: salon.name,
            city: salon.city,
            employeeCount: salonEmployeeCount,
            ...totals,
          };
        })
        .sort((a, b) => b.revenueDkk - a.revenueDkk),
    };
  },
});
