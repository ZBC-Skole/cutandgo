import { Stack } from "expo-router";

export default function OverviewLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Overblik", headerLargeTitleEnabled: true }}
      />
      <Stack.Screen name="[filter]" options={{ title: "Bookinger" }} />
      <Stack.Screen
        name="booking/[id]"
        options={{
          title: "Booking detaljer",
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.6, 1.0],
        }}
      />
    </Stack>
  );
}
