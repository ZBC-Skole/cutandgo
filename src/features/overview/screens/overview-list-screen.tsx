import { OverviewAppointmentCard } from "@/features/overview/components/overview-appointment-card";
import { demoOverviewAppointments } from "@/features/overview/data/demo-overview-appointments";
import {
  getOverviewFilterTitle,
  parseOverviewFilter,
  splitOverviewAppointments,
} from "@/features/overview/lib/appointments";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

export function OverviewListScreen() {
  const parameters = useLocalSearchParams<{ filter?: string | string[] }>();

  const filterValue = Array.isArray(parameters.filter)
    ? parameters.filter[0]
    : parameters.filter;
  const filter = parseOverviewFilter(filterValue);
  const title = getOverviewFilterTitle(filter);

  const { upcoming, past } = useMemo(
    () => splitOverviewAppointments(demoOverviewAppointments, new Date()),
    [],
  );

  const appointments = filter === "past" ? past : upcoming;

  return (
    <>
      <Stack.Screen options={{ title, headerLargeTitleEnabled: true }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-neutral-100"
        contentContainerClassName="mx-auto w-full max-w-4xl gap-3 p-4 pb-10"
      >
        {appointments.length > 0 ? (
          appointments.map((appointment, index) => (
            <OverviewAppointmentCard
              key={appointment.id}
              appointment={appointment}
              showStatus={filter === "upcoming" && index === 0}
              variant={
                filter === "past" || (filter === "upcoming" && index > 0)
                  ? "compact"
                  : "default"
              }
            />
          ))
        ) : (
          <View
            className="rounded-2xl bg-white p-4 shadow-sm"
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
