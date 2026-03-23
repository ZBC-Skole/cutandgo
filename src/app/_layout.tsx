import { RootTabs } from "@/components/navigation/root-tabs";
import AuthGuard from "@/components/ui/auth-guard";
import "@/global.css";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    expectAuth: true,
    unsavedChangesWarning: false,
  },
);

export default function RootLayout() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <AuthGuard>
        <RootTabs />
      </AuthGuard>
    </ConvexBetterAuthProvider>
  );
}
