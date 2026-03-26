import { WEEK_DAYS } from "@/features/admin/onboarding/constants";
import type { DayDraft } from "@/features/admin/onboarding/types";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

type AdminHref = "/admin" | "/employees" | "/services" | "/(settings)/admin";

export function AdminHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <View
      className="gap-4 rounded-[32px] border border-neutral-200 bg-[#111111] p-5"
      style={{
        borderCurve: "continuous",
        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
      }}
    >
      <View className="gap-2">
        <Text
          selectable
          className="text-xs font-semibold uppercase tracking-[2px] text-neutral-400"
        >
          {eyebrow}
        </Text>
        <Text selectable className="text-3xl font-semibold text-white">
          {title}
        </Text>
        <Text
          selectable
          className="max-w-3xl text-sm leading-6 text-neutral-300"
        >
          {description}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function AdminSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View
      className="gap-4 rounded-[28px] border border-neutral-200 bg-white p-5"
      style={{ borderCurve: "continuous" }}
    >
      <View className="gap-1">
        {eyebrow ? (
          <Text
            selectable
            className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500"
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text selectable className="text-xl font-semibold text-neutral-950">
          {title}
        </Text>
        {description ? (
          <Text selectable className="text-sm leading-5 text-neutral-600">
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function AdminStatCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "warm" | "dark";
}) {
  const toneClasses =
    tone === "warm"
      ? "border-amber-200 bg-amber-50"
      : tone === "dark"
        ? "border-neutral-900 bg-neutral-900"
        : "border-neutral-200 bg-neutral-50";
  const valueClasses = tone === "dark" ? "text-white" : "text-neutral-950";
  const labelClasses =
    tone === "dark" ? "text-neutral-300" : "text-neutral-500";
  const helperClasses =
    tone === "dark" ? "text-neutral-400" : "text-neutral-600";

  return (
    <View
      className={`min-w-[150px] flex-1 gap-2 rounded-[24px] border p-4 ${toneClasses}`}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        selectable
        className={`text-xs font-semibold uppercase tracking-[2px] ${labelClasses}`}
      >
        {label}
      </Text>
      <Text
        selectable
        className={`text-3xl font-semibold ${valueClasses}`}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
      {helper ? (
        <Text selectable className={`text-sm leading-5 ${helperClasses}`}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export function AdminShortcutCard({
  href,
  title,
  description,
  cta,
}: {
  href: AdminHref;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        className="min-w-[220px] flex-1 gap-3 rounded-[26px] border border-neutral-200 bg-white p-4"
        style={{
          borderCurve: "continuous",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        }}
      >
        <View className="gap-1">
          <Text selectable className="text-base font-semibold text-neutral-950">
            {title}
          </Text>
          <Text selectable className="text-sm leading-5 text-neutral-600">
            {description}
          </Text>
        </View>
        <Text selectable className="text-sm font-semibold text-neutral-900">
          {cta}
        </Text>
      </Pressable>
    </Link>
  );
}

export function AdminBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "dark";
}) {
  const classes =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-800"
        : tone === "dark"
          ? "bg-neutral-900 text-white"
          : "bg-neutral-100 text-neutral-700";

  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${classes}`}
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className="text-xs font-semibold">
        {label}
      </Text>
    </View>
  );
}

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
          multiline ? "min-h-[112px]" : ""
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
  variant?: "primary" | "secondary" | "ghost";
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

export function AdminListItem({
  title,
  subtitle,
  meta,
  selected = false,
  onPress,
  footer,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  selected?: boolean;
  onPress?: () => void;
  footer?: ReactNode;
}) {
  const content = (
    <View
      className={`gap-2 rounded-2xl border p-4 ${
        selected
          ? "border-neutral-900 bg-neutral-100"
          : "border-neutral-200 bg-neutral-50"
      }`}
      style={{ borderCurve: "continuous" }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text
          selectable
          className="flex-1 text-sm font-semibold text-neutral-950"
        >
          {title}
        </Text>
        {meta ? (
          <Text selectable className="text-xs font-semibold text-neutral-500">
            {meta}
          </Text>
        ) : null}
      </View>
      {subtitle ? (
        <Text selectable className="text-sm leading-5 text-neutral-600">
          {subtitle}
        </Text>
      ) : null}
      {footer}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={{ borderCurve: "continuous" }}>
      {content}
    </Pressable>
  );
}

export function AdminEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: AdminHref;
  actionLabel?: string;
}) {
  return (
    <View
      className="gap-3 rounded-[24px] border border-dashed border-neutral-300 bg-neutral-50 p-5"
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className="text-base font-semibold text-neutral-950">
        {title}
      </Text>
      <Text selectable className="text-sm leading-5 text-neutral-600">
        {description}
      </Text>
      {actionHref && actionLabel ? (
        <Link href={actionHref} asChild>
          <Pressable
            className="self-start rounded-full bg-neutral-900 px-4 py-2"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm font-semibold text-white">
              {actionLabel}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

export function AdminDayScheduleEditor({
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
            className="gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3"
            style={{ borderCurve: "continuous" }}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text
                selectable
                className="text-sm font-semibold text-neutral-800"
              >
                {label}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text selectable className="text-xs text-neutral-500">
                  Lukket
                </Text>
                <Switch
                  value={row.isClosed}
                  onValueChange={(value) =>
                    patchRow(row.weekday, { isClosed: value })
                  }
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <AdminTextField
                  label="Åbner"
                  value={row.opensAt}
                  onChangeText={(value) =>
                    patchRow(row.weekday, { opensAt: value })
                  }
                  placeholder="09:00"
                />
              </View>
              <View className="flex-1">
                <AdminTextField
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
