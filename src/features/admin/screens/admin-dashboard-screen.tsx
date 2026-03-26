import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import {
  AdminEmptyState,
  AdminHero,
  AdminListItem,
  AdminPillGroup,
  AdminSection,
  AdminShortcutCard,
  AdminStatCard,
} from "@/features/admin/components/admin-ui";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";

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

export function AdminDashboardScreen() {
  const { width } = useWindowDimensions();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30d");
  const [selectedSalonId, setSelectedSalonId] = useState<SalonFilter>("all");
  const isCompact = width < 820;

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
        className="flex-1 bg-stone-100"
        contentContainerClassName="mx-auto w-full max-w-6xl gap-5 p-4 pb-16"
      >
        <AdminHero
          eyebrow="Admin cockpit"
          title="Statistikken bliver relevant, når der er en salon at måle på"
          description="Start med at oprette den første salon i admin-indstillinger. Derefter kan dashboardet vise bookings, omsætning og topservices."
        >
          <View className={`gap-3 ${isCompact ? "" : "flex-row"}`}>
            <AdminShortcutCard
              href="/(settings)/admin"
              title="Opret salon"
              description="Tilføj første salon og sæt åbningstider, så adminområdet får et reelt datagrundlag."
              cta="Åbn indstillinger"
            />
            <AdminShortcutCard
              href="/employees"
              title="Medarbejdere"
              description="Gå direkte til teamadministration, når salonstrukturen er på plads."
              cta="Åbn medarbejdere"
            />
          </View>
        </AdminHero>

        <AdminEmptyState
          title="Ingen saloner endnu"
          description="Dashboardet er klar, men der findes endnu ingen aktive saloner i systemet."
          actionHref="/(settings)/admin"
          actionLabel="Opret første salon"
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-stone-100"
      contentContainerClassName="mx-auto w-full max-w-6xl gap-5 p-4 pb-16"
    >
      <AdminHero
        eyebrow="Admin cockpit"
        title="Driftsdashboard for saloner, team og bookings"
        description="Admin er nu opdelt tydeligt: statistik til overblik, medarbejder til drift af teamet og indstillinger til nye saloner."
      >
        <View className="gap-3">
          <View className="gap-2">
            <Text
              selectable
              className="text-xs font-semibold uppercase tracking-[2px] text-neutral-400"
            >
              Periode
            </Text>
            <AdminPillGroup
              options={[...PERIOD_OPTIONS]}
              selected={periodKey}
              onSelect={(value) => setPeriodKey(value)}
            />
          </View>

          <View className="gap-2">
            <Text
              selectable
              className="text-xs font-semibold uppercase tracking-[2px] text-neutral-400"
            >
              Salon
            </Text>
            <AdminPillGroup
              options={salonFilterOptions}
              selected={selectedSalonId}
              onSelect={(value) => setSelectedSalonId(value)}
            />
          </View>

          <Text selectable className="text-sm text-neutral-300">
            {formatDateRange(dashboard.period.fromTs, dashboard.period.toTs)}
          </Text>
        </View>
      </AdminHero>

      <View className={`gap-3 ${isCompact ? "" : "flex-row flex-wrap"}`}>
        <AdminStatCard
          label="Saloner"
          value={String(dashboard.totals.salonCount)}
          tone="dark"
          helper="Aktive saloner i det valgte scope"
        />
        <AdminStatCard
          label="Aktive medarbejdere"
          value={String(dashboard.totals.activeEmployeeCount)}
          tone="neutral"
          helper="Profiler med aktiv status"
        />
        <AdminStatCard
          label="Bookinger"
          value={String(dashboard.totals.totalBookings)}
          tone="warm"
          helper="Totale bookinger i perioden"
        />
        <AdminStatCard
          label="Gennemførte"
          value={String(dashboard.totals.completedBookings)}
          tone="neutral"
          helper="Bookinger med status completed"
        />
        <AdminStatCard
          label="Aflysninger"
          value={String(dashboard.totals.cancelledBookings)}
          tone="neutral"
          helper="Kunde- og salonaflysninger"
        />
        <AdminStatCard
          label="Omsætning"
          value={formatMoney(dashboard.totals.revenueDkk)}
          tone="warm"
          helper="Omsætning fra completed bookinger"
        />
      </View>

      <AdminSection
        eyebrow="Topservices"
        title="Mest solgte services"
        description="De services, der har drevet mest volumen og omsætning i den valgte periode."
      >
        <View className="gap-3">
          {dashboard.topServices.length === 0 ? (
            <AdminEmptyState
              title="Ingen completed bookinger endnu"
              description="Når en service er gennemført, bliver den vist her med antal og omsætning."
            />
          ) : (
            dashboard.topServices.map((service) => (
              <AdminListItem
                key={service.serviceId}
                title={service.serviceName}
                subtitle={`${service.count} gennemførte bookinger`}
                meta={formatMoney(service.revenueDkk)}
              />
            ))
          )}
        </View>
      </AdminSection>

      <AdminSection
        eyebrow="Salonsnapshot"
        title="Performance pr. salon"
        description="Et hurtigt driftsblik på omsætning, volumen og bemanding pr. salon i det aktuelle filter."
      >
        <View className="gap-3">
          {dashboard.salonSnapshot.length === 0 ? (
            <AdminEmptyState
              title="Ingen salondata i perioden"
              description="Skift periode eller salonfilter for at se andre tal."
            />
          ) : (
            dashboard.salonSnapshot.map((salon) => (
              <AdminListItem
                key={salon.salonId}
                title={salon.salonName}
                subtitle={`${salon.city} · ${salon.totalBookings} bookinger · ${salon.employeeCount} medarbejdere`}
                meta={formatMoney(salon.revenueDkk)}
                footer={
                  <View className="flex-row flex-wrap gap-2">
                    <Text selectable className="text-xs text-neutral-500">
                      Completed: {salon.completedBookings}
                    </Text>
                    <Text selectable className="text-xs text-neutral-500">
                      Aflysninger: {salon.cancelledBookings}
                    </Text>
                  </View>
                }
              />
            ))
          )}
        </View>
      </AdminSection>
    </ScrollView>
  );
}
