import { useRole } from "@/hooks/use-role";
import LoadingView from "@/components/ui/loading-view";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export function RootTabs() {
  const role = useRole();
  if (role.isPending) {
    return <LoadingView />;
  }

  const isAdmin = role.primaryRole === "admin";
  const isEmployee = role.primaryRole === "medarbejder";

  if (process.env.EXPO_OS === "web") {
    if (isAdmin) {
      return (
        <Tabs>
          <Tabs.Screen
            name="(admin)"
            options={{ title: "Statistik", headerShown: false }}
          />
          <Tabs.Screen
            name="employees"
            options={{ title: "Medarbejdere", headerShown: false }}
          />
          <Tabs.Screen
            name="services"
            options={{ title: "Services", headerShown: false }}
          />
          <Tabs.Screen
            name="(settings)"
            options={{ title: "Indstillinger", headerShown: false }}
          />
        </Tabs>
      );
    }

    if (isEmployee) {
      return (
        <Tabs>
          <Tabs.Screen
            name="(employee)"
            options={{ title: "Medarbejder", headerShown: false }}
          />
          <Tabs.Screen
            name="(settings)"
            options={{ title: "Indstillinger", headerShown: false }}
          />
        </Tabs>
      );
    }

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

  if (isAdmin) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="(admin)">
          <NativeTabs.Trigger.Icon
            sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
            md="bar_chart"
          />
          <NativeTabs.Trigger.Label>Statistik</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="employees">
          <NativeTabs.Trigger.Icon
            sf={{ default: "person.2", selected: "person.2.fill" }}
            md="groups"
          />
          <NativeTabs.Trigger.Label>Medarbejdere</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="services">
          <NativeTabs.Trigger.Icon
            sf={{ default: "scissors", selected: "scissors" }}
            md="content_cut"
          />
          <NativeTabs.Trigger.Label>Services</NativeTabs.Trigger.Label>
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

  if (isEmployee) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="(employee)">
          <NativeTabs.Trigger.Icon
            sf={{ default: "calendar", selected: "calendar.circle.fill" }}
            md="calendar_month"
          />
          <NativeTabs.Trigger.Label>Medarbejder</NativeTabs.Trigger.Label>
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
