import { Stack } from "expo-router";

export default function OverviewLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="index" options={{ title: "Overblik" }} />
    </Stack>
  );
}
