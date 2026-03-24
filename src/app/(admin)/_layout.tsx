import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Admin", headerLargeTitleEnabled: true }}
      />
    </Stack>
  );
}
