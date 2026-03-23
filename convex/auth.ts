import { expo } from "@better-auth/expo";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { admin as adminPlugin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc } from "better-auth/plugins/admin/access";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL!;

const ac = createAccessControl(adminAc.statements);

const admin = ac.newRole({
  ...adminAc.statements,
});

const medarbejder = ac.newRole({
  user: ["list"],
  session: ["list"],
});

const kunde = ac.newRole({
  user: [],
  session: [],
});

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [
      siteUrl,
      ...(process.env.NODE_ENV === "development"
        ? [
            "exp://", // Trust all Expo URLs
            "http://127.0.0.1:3211",
          ]
        : ["cutandgo://"]),
    ],
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Expo and Convex plugins are required
      expo(),
      convex({ authConfig }),
      crossDomain({ siteUrl }),
      adminPlugin({
        ac,
        roles: {
          admin,
          medarbejder,
          kunde,
        },
        defaultRole: "kunde",
        adminRoles: ["admin"],
      }),
    ],
  });
};

// TODO: Maybe do something with this
/* export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
}); */
