import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { requireAuthUser } from "../../security/authz";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();
  },
});

export const setMyPreferredSalon = mutation({
  args: {
    preferredSalonId: v.optional(v.id("salons")),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        preferredSalonId: args.preferredSalonId,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userProfiles", {
      authUserId: authUser._id,
      fullName: authUser.name?.trim() || "Cut&Go kunde",
      email:
        typeof authUser.email === "string" && authUser.email.trim().length > 0
          ? authUser.email.trim()
          : undefined,
      phone: undefined,
      preferredSalonId: args.preferredSalonId,
      defaultLatitude: undefined,
      defaultLongitude: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});
