import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { authComponent } from "../../auth";

export type AppRole = "admin" | "medarbejder" | "kunde";
export type SalonRole = "owner" | "manager" | "stylist" | "assistant";

type Ctx = QueryCtx | MutationCtx;

export async function requireAuthUser(ctx: Ctx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    throw new Error("Du skal være logget ind.");
  }
  return authUser;
}

export async function getAppRole(
  ctx: Ctx,
  authUserId: string,
): Promise<AppRole> {
  const roleDoc = await ctx.db
    .query("userRoles")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .unique();
  return roleDoc?.role ?? "kunde";
}

export async function requireAppRole(ctx: Ctx, allowed: AppRole[]) {
  const authUser = await requireAuthUser(ctx);
  const role = await getAppRole(ctx, authUser._id);
  if (!allowed.includes(role)) {
    throw new Error("Du har ikke tilladelse til denne handling.");
  }
  return { authUser, role };
}

export async function getEmployeeByAuthUserId(ctx: Ctx, authUserId: string) {
  return await ctx.db
    .query("employees")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .unique();
}

export async function requireSalonAccess(
  ctx: Ctx,
  salonId: Id<"salons">,
  allowedSalonRoles: SalonRole[],
) {
  const authUser = await requireAuthUser(ctx);
  const appRole = await getAppRole(ctx, authUser._id);

  if (appRole === "admin") {
    return { authUser, appRole, employee: null, assignment: null };
  }

  const employee = await getEmployeeByAuthUserId(ctx, authUser._id);
  if (!employee) {
    throw new Error("Bruger er ikke tilknyttet en medarbejderprofil.");
  }

  const assignment = await ctx.db
    .query("employeeSalonRoles")
    .withIndex("by_salon_employee", (q) =>
      q.eq("salonId", salonId).eq("employeeId", employee._id),
    )
    .unique();

  if (
    !assignment ||
    !assignment.isActive ||
    !allowedSalonRoles.includes(assignment.role)
  ) {
    throw new Error("Du har ikke adgang til denne salon.");
  }

  return { authUser, appRole, employee, assignment };
}
