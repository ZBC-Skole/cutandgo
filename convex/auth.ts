import { expo } from "@better-auth/expo";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

function resolveAuthBaseUrl() {
  const value =
    process.env.BETTER_AUTH_URL ?? process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
  if (!value) {
    throw new Error(
      "Missing auth base URL. Set BETTER_AUTH_URL (recommended) or EXPO_PUBLIC_CONVEX_SITE_URL.",
    );
  }
  return value;
}

const authBaseUrl = resolveAuthBaseUrl();
const webSiteUrl = process.env.SITE_URL ?? process.env.EXPO_PUBLIC_SITE_URL;

function getTrustedOrigins() {
  const defaults = [authBaseUrl];

  if (webSiteUrl) {
    defaults.push(webSiteUrl);
  }

  defaults.push("cutandgo://");

  if (process.env.NODE_ENV === "development") {
    defaults.push(
      "exp://", // Trust all Expo URLs in dev
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    );
  }

  return [...new Set(defaults)];
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: getTrustedOrigins(),
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
      ...(webSiteUrl ? [crossDomain({ siteUrl: webSiteUrl })] : []),
    ],
  });
};
