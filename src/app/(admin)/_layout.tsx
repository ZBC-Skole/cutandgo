import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Statistik", headerLargeTitleEnabled: true }}
      />
      <Stack.Screen
        name="employees"
        options={{ title: "Medarbejder", headerLargeTitleEnabled: true }}
      />
    </Stack>
  );
}
