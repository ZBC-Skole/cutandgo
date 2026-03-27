import type { ReactNode } from "react";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { AdminHref } from "./shared";

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
      className="gap-3 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-5"
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
