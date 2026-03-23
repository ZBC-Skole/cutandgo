import { OverviewSection } from "@/features/overview/components/overview-section";
import { demoOverviewAppointments } from "@/features/overview/data/demo-overview-appointments";
import { splitOverviewAppointments } from "@/features/overview/lib/appointments";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";

export function OverviewScreen() {
  const router = useRouter();

  const { upcoming, past } = useMemo(
    () => splitOverviewAppointments(demoOverviewAppointments, new Date()),
    [],
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-8 p-4 pb-10"
    >
      <View className="gap-8">
        <OverviewSection
          title="Kommende"
          appointments={upcoming.slice(0, 3)}
          emptyText="Ingen kommende tider endnu."
          showStatusForFirst
          onPressViewAll={() => router.push("/(overview)/upcoming")}
        />

        <OverviewSection
          title="Tidligere"
          appointments={past.slice(0, 5)}
          emptyText="Ingen tidligere bookinger endnu."
          compactAll
          onPressViewAll={() => router.push("/(overview)/past")}
        />
      </View>
    </ScrollView>
  );
}
