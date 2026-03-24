import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAppRole, requireAppRole } from "./lib/authz";

const ONBOARDING_VERSION = 1;
const ADMIN_ONBOARDING_RELEASE_CUTOFF_MS = Date.parse(
  "2026-03-24T00:00:00.000Z",
);

function readTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getAuthUserCreatedAtMs(authUser: unknown) {
  if (!authUser || typeof authUser !== "object") {
    return null;
  }

  const maybeRecord = authUser as Record<string, unknown>;
  return (
    readTimestamp(maybeRecord.createdAt) ??
    readTimestamp(maybeRecord.created_at) ??
    readTimestamp(maybeRecord.created)
  );
}

function shouldAutoCompleteForExistingAdmin(authUser: unknown) {
  const createdAtMs = getAuthUserCreatedAtMs(authUser);
  if (!createdAtMs) {
    // Defensive default: avoid interrupting existing admin accounts.
    return true;
  }

  return createdAtMs <= ADMIN_ONBOARDING_RELEASE_CUTOFF_MS;
}

export const getMyAdminOnboardingState = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const role = await getAppRole(ctx, authUser._id);
    if (role !== "admin") {
      return null;
    }

    return await ctx.db
      .query("adminOnboardingStates")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();
  },
});

export const ensureMyState = mutation({
  args: {},
  handler: async (ctx) => {
    const { authUser } = await requireAppRole(ctx, ["admin"]);

    const existing = await ctx.db
      .query("adminOnboardingStates")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const autoComplete = shouldAutoCompleteForExistingAdmin(authUser);
    const stateId = await ctx.db.insert("adminOnboardingStates", {
      authUserId: authUser._id,
      completedAt: autoComplete ? now : undefined,
      version: ONBOARDING_VERSION,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(stateId);
  },
});

export const completeMy = mutation({
  args: {},
  handler: async (ctx) => {
    const { authUser } = await requireAppRole(ctx, ["admin"]);

    const existing = await ctx.db
      .query("adminOnboardingStates")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    const now = Date.now();
    if (!existing) {
      const stateId = await ctx.db.insert("adminOnboardingStates", {
        authUserId: authUser._id,
        completedAt: now,
        version: ONBOARDING_VERSION,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(stateId);
    }

    if (existing.completedAt) {
      return existing;
    }

    await ctx.db.patch(existing._id, {
      completedAt: now,
      version: ONBOARDING_VERSION,
      updatedAt: now,
    });

    return await ctx.db.get(existing._id);
  },
});

export const resetMy = mutation({
  args: {},
  handler: async (ctx) => {
    const { authUser } = await requireAppRole(ctx, ["admin"]);

    const existing = await ctx.db
      .query("adminOnboardingStates")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    const now = Date.now();
    if (!existing) {
      const stateId = await ctx.db.insert("adminOnboardingStates", {
        authUserId: authUser._id,
        version: ONBOARDING_VERSION,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(stateId);
    }

    await ctx.db.patch(existing._id, {
      completedAt: undefined,
      dismissedAt: undefined,
      version: ONBOARDING_VERSION,
      updatedAt: now,
    });

    return await ctx.db.get(existing._id);
  },
});
