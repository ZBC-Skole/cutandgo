import { WEEK_DAYS } from "@/features/admin/onboarding/constants";
import type { DayDraft } from "@/features/admin/onboarding/types";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="gap-3 rounded-2xl bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <View className="gap-1">
        <Text
          selectable
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text selectable className="text-sm text-neutral-700">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "next" | "search";
}) {
  return (
    <View className="gap-1">
      <Text selectable className="text-xs font-semibold text-neutral-600">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-neutral-900"
      />
    </View>
  );
}

export function SelectPills<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: T }[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`rounded-full px-3 py-1.5 ${
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

export function DayEditor({
  rows,
  onChange,
}: {
  rows: DayDraft[];
  onChange: (rows: DayDraft[]) => void;
}) {
  function patchRow(
    weekday: number,
    updates: Partial<Pick<DayDraft, "opensAt" | "closesAt" | "isClosed">>,
  ) {
    onChange(
      rows.map((row) =>
        row.weekday === weekday
          ? {
              ...row,
              ...updates,
            }
          : row,
      ),
    );
  }

  return (
    <View className="gap-2">
      {rows.map((row) => {
        const label = WEEK_DAYS.find(
          (item) => item.weekday === row.weekday,
        )?.label;
        return (
          <View
            key={row.weekday}
            className="gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2"
            style={{ borderCurve: "continuous" }}
          >
            <View className="flex-row items-center justify-between">
              <Text
                selectable
                className="text-sm font-semibold text-neutral-800"
              >
                {label}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text selectable className="text-xs text-neutral-500">
                  {row.isClosed ? "Lukket" : "Åben"}
                </Text>
                <Switch
                  value={row.isClosed}
                  onValueChange={(value) =>
                    patchRow(row.weekday, { isClosed: value })
                  }
                />
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Field
                  label="Åbner"
                  value={row.opensAt}
                  onChangeText={(value) =>
                    patchRow(row.weekday, { opensAt: value })
                  }
                  placeholder="09:00"
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Lukker"
                  value={row.closesAt}
                  onChangeText={(value) =>
                    patchRow(row.weekday, { closesAt: value })
                  }
                  placeholder="17:00"
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  disabled,
  variant = "dark",
  isLoading = false,
}: {
  title: string;
  onPress: () => Promise<void> | void;
  disabled?: boolean;
  variant?: "dark" | "light";
  isLoading?: boolean;
}) {
  const bg =
    variant === "dark"
      ? disabled || isLoading
        ? "bg-neutral-200"
        : "bg-neutral-900"
      : "bg-neutral-100";
  const text = variant === "dark" ? "text-white" : "text-neutral-900";

  return (
    <Pressable
      disabled={disabled || isLoading}
      onPress={() => {
        void onPress();
      }}
      className={`rounded-xl px-3 py-2 ${bg}`}
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className={`text-center text-sm font-semibold ${text}`}>
        {isLoading ? "Gemmer..." : title}
      </Text>
    </Pressable>
  );
}
