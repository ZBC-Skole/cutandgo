import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireSalonAccess } from "./lib/authz";

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
      .withIndex("by_salon_start", (q) => q.eq("salonId", args.salonId).gte("startAt", args.fromTs).lt("startAt", args.toTs))
      .collect();

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((item) => item.status === "completed");
    const cancelledBookings = bookings.filter(
      (item) => item.status === "cancelled_by_customer" || item.status === "cancelled_by_salon",
    );
    const upcomingBookings = bookings.filter(
      (item) => (item.status === "booked" || item.status === "confirmed") && item.startAt >= Date.now(),
    );
    const revenueDkk = completedBookings.reduce((sum, item) => sum + item.priceDkkSnapshot, 0);

    const perService = new Map<string, { serviceName: string; count: number; revenueDkk: number }>();
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

    const topServices = [...perService.values()].sort((a, b) => b.count - a.count);

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

