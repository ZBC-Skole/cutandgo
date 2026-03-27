import type { ReactNode } from "react";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { AdminBadgeTone, AdminHref, AdminTone } from "./shared";

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
      className="gap-4 rounded-4xl border border-neutral-200 bg-[#111111] p-5"
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
  tone?: AdminTone;
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
      className={`min-w-37.5 flex-1 gap-2 rounded-3xl border p-4 ${toneClasses}`}
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
        className="min-w-55 flex-1 gap-3 rounded-[26px] border border-neutral-200 bg-white p-4"
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
  tone?: AdminBadgeTone;
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
