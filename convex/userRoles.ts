import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { requireAuthUser } from "./lib/authz";

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

export const bootstrapFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);

    const adminRoles = (await ctx.db.query("userRoles").collect()).filter(
      (entry) => entry.role === "admin",
    );

    if (adminRoles.length > 0) {
      const existing = await ctx.db
        .query("userRoles")
        .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
        .unique();

      if (existing?.role === "admin") {
        return { alreadyAdmin: true };
      }

      throw new Error("Der findes allerede en admin-bruger.");
    }

    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: "admin",
        updatedAt: now,
      });
      return { promoted: true };
    }

    await ctx.db.insert("userRoles", {
      authUserId: authUser._id,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    return { promoted: true };
  },
});
