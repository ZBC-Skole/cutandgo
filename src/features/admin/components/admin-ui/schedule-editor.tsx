import { Switch, Text, View } from "react-native";

import { WEEK_DAYS } from "@/features/admin/onboarding/constants";
import type { DayDraft } from "@/features/admin/onboarding/types";

import { AdminTextField } from "./form-controls";

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
