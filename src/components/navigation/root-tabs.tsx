import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export function RootTabs() {
  if (process.env.EXPO_OS === "web") {
    return (
      <Tabs>
        <Tabs.Screen
          name="(overview)"
          options={{ title: "Overblik", headerShown: false }}
        />
        <Tabs.Screen
          name="(orders)"
          options={{ title: "Booking", headerShown: false }}
        />
        <Tabs.Screen
          name="(settings)"
          options={{ title: "Indstillinger", headerShown: false }}
        />
      </Tabs>
    );
  }

  return (
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
  );
}
