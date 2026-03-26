import { Stack } from "expo-router";

export default function EmployeeLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Medarbejder", headerLargeTitleEnabled: true }}
      />
    </Stack>
  );
}
