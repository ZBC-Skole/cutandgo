import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

type AppRole = "admin" | "medarbejder" | "kunde";

function sanitizeRole(role: string | undefined): AppRole {
  if (role === "admin" || role === "medarbejder" || role === "kunde") {
    return role;
  }

  return "kunde";
}

export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return "kunde" as AppRole;
    }

    const roleDoc = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    if (!roleDoc) {
      return "kunde" as AppRole;
    }

    return sanitizeRole(String(roleDoc.role));
  },
});

// Optional helper for manual role management during development.
export const setRoleForUser = mutation({
  args: {
    authUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("medarbejder"), v.literal("kunde")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", args.authUserId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role, updatedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("userRoles", {
      authUserId: args.authUserId,
      role: args.role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
