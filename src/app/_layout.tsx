import "@/global.css";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { NativeTabs } from "expo-router/unstable-native-tabs";

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
      <NativeTabs>
        <NativeTabs.Trigger name="(overview)">
          <NativeTabs.Trigger.Icon
            sf={{
              default: "rectangle.grid.2x2",
              selected: "rectangle.grid.2x2.fill",
            }}
            md="home"
          />
          <NativeTabs.Trigger.Label>Overblik</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(orders)">
          <NativeTabs.Trigger.Icon
            sf={{ default: "cart", selected: "cart.fill" }}
            md="shopping_cart"
          />
          <NativeTabs.Trigger.Label>Booking</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(settings)">
          <NativeTabs.Trigger.Icon
            sf={{ default: "gear", selected: "gearshape.fill" }}
            md="settings"
          />
          <NativeTabs.Trigger.Label>Indstillinger</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ConvexBetterAuthProvider>
  );
}
