import type { MutationCtx } from "../../../_generated/server";

export const activeBookingStatuses = new Set(["booked", "confirmed"]);

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export async function syncEmployeesFromWorkerRoles(ctx: MutationCtx) {
  const roleDocs = await ctx.db.query("userRoles").collect();
  const workerRoles = roleDocs.filter((roleDoc) => roleDoc.role === "medarbejder");

  const now = Date.now();
  for (const roleDoc of workerRoles) {
    const existing = await ctx.db
      .query("employees")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", roleDoc.authUserId))
      .unique();
    if (existing) {
      continue;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", roleDoc.authUserId))
      .unique();

    await ctx.db.insert("employees", {
      authUserId: roleDoc.authUserId,
      fullName:
        profile?.fullName?.trim() || `Medarbejder ${String(roleDoc.authUserId).slice(-6)}`,
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
