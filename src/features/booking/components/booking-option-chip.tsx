import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type BookingOptionChipProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  className?: string;
};

export function BookingOptionChip({
  title,
  subtitle,
  selected,
  onPress,
  className,
}: BookingOptionChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-w-35 rounded-xl border px-3 py-3 ${
        selected
          ? "border-neutral-900 bg-neutral-900"
          : "border-neutral-200 bg-white"
      } ${className ?? ""}`}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        selectable
        className={`text-[15px] font-semibold leading-5 ${selected ? "text-white" : "text-neutral-900"}`}
      >
        {title}
      </Text>
      {subtitle ? (
        <View className="mt-2 flex-row items-center gap-1.5">
          <Ionicons
            name="location-outline"
            size={12}
            color={selected ? "#D4D4D8" : "#6B7280"}
          />
          <Text
            selectable
            numberOfLines={1}
            className={`flex-1 text-xs ${selected ? "text-neutral-200" : "text-neutral-500"}`}
          >
            {subtitle}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
