import { Pressable, Switch, Text, TextInput, View } from "react-native";

import type { AdminButtonVariant } from "./shared";

export function AdminPillGroup<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`rounded-full px-3 py-2 ${
              isSelected ? "bg-neutral-900" : "bg-neutral-100"
            }`}
            style={{ borderCurve: "continuous" }}
          >
            <Text
              selectable
              className={`text-xs font-semibold ${
                isSelected ? "text-white" : "text-neutral-700"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AdminTextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "sentences",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text selectable className="text-xs font-semibold text-neutral-600">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-950 ${
          multiline ? "min-h-28" : ""
        }`}
      />
    </View>
  );
}

export function AdminSwitchField({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View
      className="flex-row items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
      style={{ borderCurve: "continuous" }}
    >
      <View className="flex-1 gap-1">
        <Text selectable className="text-sm font-semibold text-neutral-950">
          {label}
        </Text>
        {description ? (
          <Text selectable className="text-sm leading-5 text-neutral-600">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function AdminButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: AdminButtonVariant;
  disabled?: boolean;
}) {
  const classes =
    variant === "primary"
      ? disabled
        ? "bg-neutral-200"
        : "bg-neutral-950"
      : variant === "secondary"
        ? "bg-neutral-100"
        : "bg-transparent";
  const textClasses =
    variant === "primary"
      ? disabled
        ? "text-neutral-500"
        : "text-white"
      : "text-neutral-900";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      className={`rounded-2xl px-4 py-3 ${classes}`}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        selectable
        className={`text-center text-sm font-semibold ${textClasses}`}
      >
        {title}
      </Text>
    </Pressable>
  );
}
