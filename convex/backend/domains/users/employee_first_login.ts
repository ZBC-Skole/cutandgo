import { mutation, query } from "../../../_generated/server";
import { getAppRole, requireAuthUser } from "../../security/authz";

export const getMyEmployeeFirstLoginStatus = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);
    const role = await getAppRole(ctx, authUser._id);

    if (role !== "medarbejder") {
      return {
        mustChangePassword: false,
      };
    }

    const requirement = await ctx.db
      .query("employeeFirstLoginRequirements")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    return {
      mustChangePassword: requirement?.mustChangePassword ?? false,
      temporaryPinIssuedAt: requirement?.temporaryPinIssuedAt,
      completedAt: requirement?.completedAt,
    };
  },
});

export const completeMyEmployeeFirstLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);

    const requirement = await ctx.db
      .query("employeeFirstLoginRequirements")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUser._id))
      .unique();

    if (!requirement) {
      return { success: true };
    }

    if (!requirement.mustChangePassword) {
      return { success: true };
    }

    await ctx.db.patch(requirement._id, {
      mustChangePassword: false,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
