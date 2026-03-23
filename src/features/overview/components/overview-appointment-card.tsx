import {
  formatOverviewDate,
  formatOverviewTime,
} from "@/features/overview/lib/date-time";
import type { OverviewAppointment } from "@/features/overview/types";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const monthFormatter = new Intl.DateTimeFormat("da-DK", { month: "short" });
const dayFormatter = new Intl.DateTimeFormat("da-DK", { day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("da-DK", {
  hour: "2-digit",
  minute: "2-digit",
});

type OverviewAppointmentCardProperties = {
  appointment: OverviewAppointment;
  showStatus?: boolean;
  variant?: "default" | "compact";
};

export function OverviewAppointmentCard({
  appointment,
  showStatus = false,
  variant = "default",
}: OverviewAppointmentCardProperties) {
  const startDate = new Date(appointment.startsAt);
  const endDate = new Date(
    startDate.getTime() + appointment.durationMinutes * 60_000,
  );

  if (variant === "compact") {
    const month = monthFormatter
      .format(startDate)
      .replace(".", "")
      .toUpperCase();
    const day = dayFormatter.format(startDate).replace(".", "");
    const time = timeFormatter.format(startDate);

    return (
      <View
        className="flex-row items-center gap-3 rounded-2xl bg-neutral-200/60 p-4"
        style={{ borderCurve: "continuous" }}
      >
        <View
          className="size-14 items-center rounded-xl bg-neutral-100/60 p-2"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-xs font-semibold text-neutral-500">
            {month}
          </Text>
          <Text selectable className="text-xl font-bold  text-neutral-800">
            {day}
          </Text>
        </View>

        <View className="flex-1 gap-1">
          <Text selectable className="text-2xl font-semibold text-neutral-900">
            {appointment.serviceName}
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            {time} • {appointment.salonName} • {appointment.stylistName}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} />
      </View>
    );
  }

  return (
    <View
      className="gap-3 rounded-2xl bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text selectable className="text-xl font-semibold text-neutral-900">
            {appointment.serviceName}
          </Text>
          <Text selectable className="text-sm text-neutral-500">
            {appointment.salonName}
          </Text>
        </View>

        {showStatus && appointment.statusLabel ? (
          <View
            className="rounded-full bg-blue-100 px-3 py-1"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-xs font-bold text-blue-700">
              {appointment.statusLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="h-px bg-neutral-200" />

      <View className="flex-row items-end justify-between gap-3">
        <View className="gap-1">
          <Text
            selectable
            className="text-xs uppercase tracking-wide text-neutral-500"
          >
            Dato & tid
          </Text>
          <Text
            selectable
            className="text-base font-semibold text-neutral-900"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatOverviewDate(startDate)}, {formatOverviewTime(startDate)} -{" "}
            {formatOverviewTime(endDate)}
          </Text>
        </View>

        <View className="items-end gap-1">
          <Text
            selectable
            className="text-xs uppercase tracking-wide text-neutral-500"
          >
            Stylist
          </Text>
          <Text selectable className="text-base font-semibold text-neutral-900">
            {appointment.stylistName}
          </Text>
        </View>
      </View>
    </View>
  );
}
