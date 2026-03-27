import { api } from "@/convex/_generated/api";
import LoadingView from "@/components/ui/loading-view";
import { OverviewAppointmentCard } from "@/features/overview/components/overview-appointment-card";
import {
  getOverviewFilterTitle,
  parseOverviewFilter,
  splitOverviewAppointments,
} from "@/features/overview/lib/appointments";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

export function OverviewListScreen() {
  const router = useRouter();
  const allAppointments = useQuery(
    api.backend.domains.bookings.index.getMyOverviewBookings,
  );
  const parameters = useLocalSearchParams<{ filter?: string | string[] }>();

  const filterValue = Array.isArray(parameters.filter)
    ? parameters.filter[0]
    : parameters.filter;
  const filter = parseOverviewFilter(filterValue);
  const title = getOverviewFilterTitle(filter);

  const { upcoming, past } = useMemo(
    () => splitOverviewAppointments(allAppointments ?? [], new Date()),
    [allAppointments],
  );

  const appointments = filter === "past" ? past : upcoming;

  if (!allAppointments) {
    return <LoadingView />;
  }

  return (
    <>
      <Stack.Screen options={{ title, headerLargeTitleEnabled: true }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-neutral-100"
        contentContainerClassName="mx-auto w-full max-w-4xl gap-3 p-4 pb-10"
      >
        {appointments.length > 0 ? (
          <View
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white px-4"
            style={{ borderCurve: "continuous" }}
          >
            {appointments.map((appointment, index) => (
              <View key={appointment.id}>
                <OverviewAppointmentCard
                  appointment={appointment}
                  showStatus={filter === "upcoming" && index === 0}
                  onPress={() =>
                    router.push(`/(overview)/booking/${appointment.id}`)
                  }
                  variant={
                    filter === "past" || (filter === "upcoming" && index > 0)
                      ? "compact"
                      : "default"
                  }
                />
                {index < appointments.length - 1 ? (
                  <View className="h-px bg-neutral-200" />
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View
            className="rounded-2xl border border-neutral-200 bg-white p-4"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm text-neutral-500">
              {filter === "past"
                ? "Ingen tidligere bookinger endnu."
                : "Ingen kommende tider endnu."}
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
