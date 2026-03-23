import { Stack } from "expo-router";

export default function OrdersLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Booking", headerLargeTitleEnabled: true }}
      />
    </Stack>
  );
}
