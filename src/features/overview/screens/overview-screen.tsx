import { api } from "@/convex/_generated/api";
import LoadingView from "@/components/ui/loading-view";
import { OverviewSection } from "@/features/overview/components/overview-section";
import { splitOverviewAppointments } from "@/features/overview/lib/appointments";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";

export function OverviewScreen() {
  const router = useRouter();
  const appointments = useQuery(api.bookings.getMyOverviewBookings);

  const { upcoming, past } = useMemo(
    () => splitOverviewAppointments(appointments ?? [], new Date()),
    [appointments],
  );

  const upcomingWithStatus = useMemo(
    () =>
      upcoming.map((appointment, index) =>
        index === 0 ? { ...appointment, statusLabel: "NÆSTE" } : appointment,
      ),
    [upcoming],
  );

  if (!appointments) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-8 p-4 pb-10"
    >
      <View className="gap-8">
        <OverviewSection
          title="Kommende"
          appointments={upcomingWithStatus.slice(0, 3)}
          emptyText="Ingen kommende tider endnu."
          showStatusForFirst
          onPressAppointment={(appointment) =>
            router.push(`/(overview)/booking/${appointment.id}`)
          }
          onPressViewAll={() => router.push("/(overview)/upcoming")}
        />

        <OverviewSection
          title="Tidligere"
          appointments={past.slice(0, 5)}
          emptyText="Ingen tidligere bookinger endnu."
          compactAll
          onPressAppointment={(appointment) =>
            router.push(`/(overview)/booking/${appointment.id}`)
          }
          onPressViewAll={() => router.push("/(overview)/past")}
        />
      </View>
    </ScrollView>
  );
}
