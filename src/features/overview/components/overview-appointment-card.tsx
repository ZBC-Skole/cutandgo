import {
  formatOverviewDate,
  formatOverviewTime,
} from "@/features/overview/lib/date-time";
import type { OverviewAppointment } from "@/features/overview/types";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

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
  onPress?: () => void;
};

export function OverviewAppointmentCard({
  appointment,
  showStatus = false,
  variant = "default",
  onPress,
}: OverviewAppointmentCardProperties) {
  const startDate = new Date(appointment.startsAt);
  const endDate = new Date(
    startDate.getTime() + appointment.durationMinutes * 60_000,
  );
  const month = monthFormatter.format(startDate).replace(".", "").toUpperCase();
  const day = dayFormatter.format(startDate).replace(".", "");
  const time = timeFormatter.format(startDate);

  const content = (
    <View className="flex-row items-center gap-3 py-3">
      <View
        className={`items-center rounded-xl p-2 ${
          variant === "compact"
            ? "w-14 bg-neutral-100/80"
            : "w-15 bg-neutral-100"
        }`}
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-[10px] font-semibold text-neutral-500">
          {month}
        </Text>
        <Text selectable className="text-lg font-bold text-neutral-900">
          {day}
        </Text>
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text
            selectable
            className={`font-semibold text-neutral-900 ${
              variant === "compact" ? "text-base" : "text-lg"
            }`}
          >
            {appointment.serviceName}
          </Text>
          {showStatus && appointment.statusLabel ? (
            <View
              className="rounded-full bg-blue-100 px-2 py-0.5"
              style={{ borderCurve: "continuous" }}
            >
              <Text selectable className="text-[10px] font-bold text-blue-700">
                {appointment.statusLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <Text selectable className="text-xs text-neutral-500">
          {time} · {appointment.salonName}
        </Text>
        <Text selectable className="text-xs text-neutral-500">
          {appointment.stylistName} · {formatOverviewDate(startDate)} ·{" "}
          {formatOverviewTime(startDate)}-{formatOverviewTime(endDate)}
        </Text>
      </View>

      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View>{content}</View>;
}
