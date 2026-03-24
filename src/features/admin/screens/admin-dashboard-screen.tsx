import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ScrollView, Text, View } from "react-native";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-1 gap-1 rounded-2xl border border-neutral-200 bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <Text
        selectable
        className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {label}
      </Text>
      <Text selectable className="text-xl font-semibold text-neutral-900">
        {value}
      </Text>
    </View>
  );
}

export function AdminDashboardScreen() {
  const salons = useQuery(api.salons.listActive) ?? [];
  const employees = useQuery(api.staff.listEmployees) ?? [];
  const firstSalonId = salons[0]?._id;
  const categories =
    useQuery(
      api.services.listBySalon,
      firstSalonId ? { salonId: firstSalonId, activeOnly: false } : "skip",
    ) ?? [];

  const categoryCount = categories.length;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-16"
    >
      <View
        className="gap-2 rounded-2xl bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text
          selectable
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Admin hub
        </Text>
        <Text selectable className="text-lg font-semibold text-neutral-900">
          Oversigt over din salon drift
        </Text>
        <Text selectable className="text-sm text-neutral-600">
          Onboarding er gennemført. Du kan nu styre data, teams og services fra
          admin.
        </Text>
      </View>

      <View className="flex-row gap-3">
        <StatCard label="Saloner" value={String(salons.length)} />
        <StatCard label="Ansatte" value={String(employees.length)} />
      </View>

      <View className="flex-row gap-3">
        <StatCard
          label="Kategorier (første salon)"
          value={String(categoryCount)}
        />
      </View>
    </ScrollView>
  );
}
