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
      className={`min-w-[140px] rounded-xl border p-3 ${
        selected
          ? "border-neutral-900 bg-neutral-900"
          : "border-neutral-200 bg-white"
      } ${className ?? ""}`}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        selectable
        className={`text-sm font-semibold ${selected ? "text-white" : "text-neutral-900"}`}
      >
        {title}
      </Text>
      {subtitle ? (
        <View className="mt-1">
          <Text
            selectable
            className={`text-xs ${selected ? "text-neutral-200" : "text-neutral-500"}`}
          >
            {subtitle}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
