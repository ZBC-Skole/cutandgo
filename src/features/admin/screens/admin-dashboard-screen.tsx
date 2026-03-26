import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import { AdminPillGroup } from "@/features/admin/components/admin-ui";
import { Link } from "expo-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const PERIOD_OPTIONS = [
  { label: "7 dage", value: "7d" },
  { label: "30 dage", value: "30d" },
  { label: "90 dage", value: "90d" },
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]["value"];
type SalonFilter = "all" | Id<"salons">;

function formatMoney(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateRange(fromTs: number, toTs: number) {
  const formatter = new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
  });
  return `${formatter.format(fromTs)} - ${formatter.format(toTs)}`;
}

function MetricRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text selectable className="text-sm text-neutral-600">
        {label}
      </Text>
      <Text
        selectable
        className={`text-sm font-semibold ${
          emphasize ? "text-neutral-950" : "text-neutral-800"
        }`}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="gap-1 pb-2">
      <Text selectable className="text-lg font-semibold text-neutral-950">
        {title}
      </Text>
      {subtitle ? (
        <Text selectable className="text-sm text-neutral-500">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function AdminDashboardScreen() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30d");
  const [selectedSalonId, setSelectedSalonId] = useState<SalonFilter>("all");

  const dashboard = useQuery(
    api.analytics.getAdminDashboard,
    selectedSalonId === "all"
      ? { periodKey }
      : { periodKey, salonId: selectedSalonId },
  );

  const salonOptions = dashboard?.filters.salonOptions;
  const salonFilterOptions = useMemo(
    () => [
      { label: "Alle saloner", value: "all" as const },
      ...(salonOptions ?? []).map((salon) => ({
        label: salon.name,
        value: salon._id,
      })),
    ],
    [salonOptions],
  );

  if (!dashboard) {
    return <LoadingView />;
  }

  if (!salonOptions || salonOptions.length === 0) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-[#f5f5f7]"
        contentContainerClassName="mx-auto w-full max-w-4xl gap-5 px-4 pb-16"
      >
        <View className="gap-2 pt-2">
          <Text
            selectable
            className="text-xs uppercase tracking-[2px] text-neutral-500"
          >
            Statistik
          </Text>
          <Text selectable className="text-3xl font-semibold text-neutral-950">
            Klar til overblik
          </Text>
          <Text selectable className="text-sm leading-6 text-neutral-600">
            Opret den første salon for at aktivere live KPI&apos;er, topservices
            og performance-pr-salon.
          </Text>
        </View>

        <View
          className="rounded-3xl border border-neutral-200 bg-white p-4"
          style={{ borderCurve: "continuous" }}
        >
          <SectionHeader
            title="Ingen saloner endnu"
            subtitle="Når første salon er oprettet, opdateres statistik-siden automatisk."
          />
          <Link href="/(settings)/admin" asChild>
            <Pressable
              className="mt-2 rounded-2xl bg-neutral-900 px-4 py-3"
              style={{ borderCurve: "continuous" }}
            >
              <Text
                selectable
                className="text-center text-sm font-semibold text-white"
              >
                Opret første salon
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-[#f5f5f7]"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-5 px-4 pb-20"
    >
      <View className="gap-2 pt-2">
        <Text
          selectable
          className="text-xs uppercase tracking-[2px] text-neutral-500"
        >
          Statistik
        </Text>
        <Text selectable className="text-3xl font-semibold text-neutral-950">
          Drift i realtid
        </Text>
        <Text selectable className="text-sm text-neutral-500">
          {formatDateRange(dashboard.period.fromTs, dashboard.period.toTs)}
        </Text>
      </View>

      <View
        className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <View className="gap-2">
          <Text
            selectable
            className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500"
          >
            Periode
          </Text>
          <AdminPillGroup
            options={[...PERIOD_OPTIONS]}
            selected={periodKey}
            onSelect={(value) => setPeriodKey(value)}
          />
        </View>

        <View className="h-px bg-neutral-200" />

        <View className="gap-2">
          <Text
            selectable
            className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500"
          >
            Salon
          </Text>
          <AdminPillGroup
            options={salonFilterOptions}
            selected={selectedSalonId}
            onSelect={(value) => setSelectedSalonId(value)}
          />
        </View>
      </View>

      <View
        className="rounded-3xl border border-neutral-200 bg-white px-4 py-2"
        style={{ borderCurve: "continuous" }}
      >
        <SectionHeader title="KPI" subtitle="Ren, hurtig status for perioden" />
        <MetricRow
          label="Omsætning"
          value={formatMoney(dashboard.totals.revenueDkk)}
          emphasize
        />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Bookinger i alt"
          value={String(dashboard.totals.totalBookings)}
        />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Gennemførte"
          value={String(dashboard.totals.completedBookings)}
        />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Aflysninger"
          value={String(dashboard.totals.cancelledBookings)}
        />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Aktive medarbejdere"
          value={String(dashboard.totals.activeEmployeeCount)}
        />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Aktive saloner"
          value={String(dashboard.totals.salonCount)}
        />
      </View>

      <View
        className="rounded-3xl border border-neutral-200 bg-white px-4 py-2"
        style={{ borderCurve: "continuous" }}
      >
        <SectionHeader
          title="Topservices"
          subtitle="Højeste efterspørgsel i den valgte periode"
        />
        {dashboard.topServices.length === 0 ? (
          <Text selectable className="py-3 text-sm text-neutral-500">
            Ingen gennemførte bookinger endnu.
          </Text>
        ) : (
          dashboard.topServices.map((service, index) => (
            <View key={service.serviceId}>
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-1 pr-3">
                  <Text
                    selectable
                    className="text-sm font-semibold text-neutral-900"
                  >
                    {service.serviceName}
                  </Text>
                  <Text selectable className="text-xs text-neutral-500">
                    {service.count} gennemførte bookinger
                  </Text>
                </View>
                <Text
                  selectable
                  className="text-sm font-semibold text-neutral-900"
                >
                  {formatMoney(service.revenueDkk)}
                </Text>
              </View>
              {index < dashboard.topServices.length - 1 ? (
                <View className="h-px bg-neutral-200" />
              ) : null}
            </View>
          ))
        )}
      </View>

      <View
        className="rounded-3xl border border-neutral-200 bg-white px-4 py-2"
        style={{ borderCurve: "continuous" }}
      >
        <SectionHeader
          title="Performance pr. salon"
          subtitle="Omsætning, volumen og bemanding"
        />
        {dashboard.salonSnapshot.length === 0 ? (
          <Text selectable className="py-3 text-sm text-neutral-500">
            Ingen salondata i perioden.
          </Text>
        ) : (
          dashboard.salonSnapshot.map((salon, index) => (
            <View key={salon.salonId}>
              <View className="gap-2 py-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    selectable
                    className="flex-1 text-sm font-semibold text-neutral-900"
                  >
                    {salon.salonName}
                  </Text>
                  <Text
                    selectable
                    className="text-sm font-semibold text-neutral-900"
                  >
                    {formatMoney(salon.revenueDkk)}
                  </Text>
                </View>
                <Text selectable className="text-xs text-neutral-500">
                  {salon.city} · {salon.totalBookings} bookinger ·{" "}
                  {salon.employeeCount} medarbejdere · {salon.cancelledBookings}{" "}
                  aflysninger
                </Text>
              </View>
              {index < dashboard.salonSnapshot.length - 1 ? (
                <View className="h-px bg-neutral-200" />
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
