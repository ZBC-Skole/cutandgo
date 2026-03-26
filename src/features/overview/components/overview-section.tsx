import { OverviewAppointmentCard } from "@/features/overview/components/overview-appointment-card";
import type { OverviewAppointment } from "@/features/overview/types";
import { Pressable, Text, View } from "react-native";

type OverviewSectionProperties = {
  title: string;
  appointments: OverviewAppointment[];
  emptyText: string;
  onPressViewAll: () => void;
  onPressAppointment?: (appointment: OverviewAppointment) => void;
  showStatusForFirst?: boolean;
  compactAll?: boolean;
};

export function OverviewSection({
  title,
  appointments,
  emptyText,
  onPressViewAll,
  onPressAppointment,
  showStatusForFirst = false,
  compactAll = false,
}: OverviewSectionProperties) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text selectable className="text-2xl font-bold text-neutral-900">
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onPressViewAll}
          className="rounded-full px-2 py-1"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-base font-semibold text-blue-600">
            Vis alle
          </Text>
        </Pressable>
      </View>

      {appointments.length > 0 ? (
        <View
          className="overflow-hidden rounded-2xl border border-neutral-200 bg-white px-4"
          style={{ borderCurve: "continuous" }}
        >
          {appointments.map((appointment, index) => (
            <View key={appointment.id}>
              <OverviewAppointmentCard
                appointment={appointment}
                showStatus={showStatusForFirst && index === 0}
                variant={
                  compactAll || (showStatusForFirst && index > 0)
                    ? "compact"
                    : "default"
                }
                onPress={
                  onPressAppointment
                    ? () => onPressAppointment(appointment)
                    : undefined
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
            {emptyText}
          </Text>
        </View>
      )}
    </View>
  );
}
