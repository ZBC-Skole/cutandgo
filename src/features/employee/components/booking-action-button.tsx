import { Pressable, Text } from "react-native";

export function BookingActionButton({
  label,
  disabled = false,
  onPress,
  tone = "neutral",
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  tone?: "neutral" | "success" | "danger";
}) {
  const className = `items-center justify-center rounded-xl px-3 py-3 ${
    tone === "success"
      ? disabled
        ? "bg-emerald-100"
        : "bg-emerald-500"
      : tone === "danger"
        ? disabled
          ? "bg-red-100"
          : "bg-red-500"
        : disabled
          ? "bg-neutral-200"
          : "bg-neutral-900"
  }`;
  const textClassName =
    tone === "neutral" && !disabled
      ? "text-white"
      : tone === "success" && !disabled
        ? "text-white"
        : tone === "danger" && !disabled
          ? "text-white"
          : tone === "success"
            ? "text-emerald-800"
            : tone === "danger"
              ? "text-red-700"
              : "text-neutral-700";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={className}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        selectable
        className={`text-center text-sm font-semibold ${textClassName}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
