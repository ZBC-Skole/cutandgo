import type { Id } from "@/convex/_generated/dataModel";
import {
  AdminButton,
  AdminEmptyState,
  AdminPillGroup,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import {
  formatMoney,
  type AdminServicesScreenState,
} from "@/features/admin/hooks/use-admin-services-screen";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export function AdminServicesHeader() {
  return (
    <>
      <View className="gap-2 pt-2">
        <Text
          selectable
          className="text-xs uppercase tracking-[2px] text-neutral-500"
        >
          Services
        </Text>
        <Text selectable className="text-3xl font-semibold text-neutral-950">
          Service setup
        </Text>
        <Text selectable className="text-sm leading-6 text-neutral-600">
          Opret servicekategorier og klipninger/behandlinger pr. salon.
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <Link href="/admin" asChild>
          <Pressable
            className="rounded-full border border-neutral-300 bg-white px-4 py-2"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm font-semibold text-neutral-900">
              Statistik
            </Text>
          </Pressable>
        </Link>
        <Link href="/employees" asChild>
          <Pressable
            className="rounded-full border border-neutral-300 bg-white px-4 py-2"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm font-semibold text-neutral-900">
              Medarbejdere
            </Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

export function SalonSelectorSection({
  screen,
}: {
  screen: AdminServicesScreenState;
}) {
  const salons = screen.salons ?? [];

  return (
    <View
      className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className="text-lg font-semibold text-neutral-950">
        Vælg salon
      </Text>
      {salons.length === 0 ? (
        <AdminEmptyState
          title="Ingen saloner endnu"
          description="Opret en salon i indstillinger før du opretter services."
          actionHref="/(settings)/admin"
          actionLabel="Opret salon"
        />
      ) : (
        <AdminPillGroup
          options={salons.map((salon) => ({
            label: salon.name,
            value: salon._id,
          }))}
          selected={screen.selectedSalonId ?? salons[0]._id}
          onSelect={(value) => screen.setSelectedSalonId(value)}
        />
      )}
    </View>
  );
}

export function ServiceMetricsSection({
  screen,
}: {
  screen: AdminServicesScreenState;
}) {
  return (
    <View
      className="rounded-3xl border border-neutral-200 bg-white px-4 py-2"
      style={{ borderCurve: "continuous" }}
    >
      <MetricRow
        label="Kategorier"
        value={String(screen.metrics.categoryCount)}
      />
      <View className="h-px bg-neutral-200" />
      <MetricRow label="Services" value={String(screen.metrics.serviceCount)} />
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text selectable className="text-sm text-neutral-600">
        {label}
      </Text>
      <Text
        selectable
        className="text-sm font-semibold text-neutral-900"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

export function CreateCategorySection({
  screen,
}: {
  screen: AdminServicesScreenState;
}) {
  return (
    <View
      className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className="text-lg font-semibold text-neutral-950">
        Opret kategori
      </Text>
      <AdminTextField
        label="Kategorinavn"
        value={screen.newCategoryName}
        onChangeText={screen.setNewCategoryName}
        placeholder="Klipninger"
      />
      <AdminButton
        title={
          screen.isCreatingCategory ? "Opretter kategori..." : "Opret kategori"
        }
        onPress={screen.handleCreateCategory}
        disabled={screen.isCreatingCategory || !screen.selectedSalonId}
      />
    </View>
  );
}

export function CreateServiceSection({
  screen,
}: {
  screen: AdminServicesScreenState;
}) {
  return (
    <View
      className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className="text-lg font-semibold text-neutral-950">
        Opret service
      </Text>
      {!screen.categories || screen.categories.length === 0 ? (
        <AdminEmptyState
          title="Ingen kategorier endnu"
          description="Opret mindst én kategori før du opretter service."
        />
      ) : (
        <>
          <View className="gap-2">
            <Text
              selectable
              className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500"
            >
              Kategori
            </Text>
            <AdminPillGroup
              options={screen.categories.map((category) => ({
                label: category.name,
                value: category._id,
              }))}
              selected={screen.selectedCategoryId ?? screen.categories[0]._id}
              onSelect={(value) => screen.setSelectedCategoryId(value)}
            />
          </View>
          <AdminTextField
            label="Servicenavn"
            value={screen.serviceForm.name}
            onChangeText={(value) => patchServiceForm(screen, { name: value })}
            placeholder="Herreklip"
          />
          <AdminTextField
            label="Beskrivelse"
            value={screen.serviceForm.description}
            onChangeText={(value) =>
              patchServiceForm(screen, { description: value })
            }
            placeholder="Kort beskrivelse af servicen"
            multiline
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <AdminTextField
                label="Varighed (min)"
                value={screen.serviceForm.durationMinutes}
                onChangeText={(value) =>
                  patchServiceForm(screen, { durationMinutes: value })
                }
                placeholder="30"
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <AdminTextField
                label="Pris (DKK)"
                value={screen.serviceForm.priceDkk}
                onChangeText={(value) =>
                  patchServiceForm(screen, { priceDkk: value })
                }
                placeholder="320"
                keyboardType="numeric"
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <AdminTextField
                label="Buffer før (min)"
                value={screen.serviceForm.bufferBeforeMinutes}
                onChangeText={(value) =>
                  patchServiceForm(screen, { bufferBeforeMinutes: value })
                }
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <AdminTextField
                label="Buffer efter (min)"
                value={screen.serviceForm.bufferAfterMinutes}
                onChangeText={(value) =>
                  patchServiceForm(screen, { bufferAfterMinutes: value })
                }
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>
          <AdminButton
            title={
              screen.isCreatingService ? "Opretter service..." : "Opret service"
            }
            onPress={screen.handleCreateService}
            disabled={screen.isCreatingService || !screen.selectedSalonId}
          />
        </>
      )}
    </View>
  );
}

function patchServiceForm(
  screen: AdminServicesScreenState,
  patch: Partial<AdminServicesScreenState["serviceForm"]>,
) {
  screen.setServiceForm((current) => ({ ...current, ...patch }));
}

export function ServicesListSection({
  screen,
}: {
  screen: AdminServicesScreenState;
}) {
  return (
    <View
      className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className="text-lg font-semibold text-neutral-950">
        Services i valgt salon
      </Text>
      {!screen.categories || screen.categories.length === 0 ? (
        <AdminEmptyState
          title="Ingen services endnu"
          description="Når du opretter services, vises de her pr. kategori."
        />
      ) : (
        <View className="gap-3">
          {screen.categories.map((category) => (
            <View
              key={category._id}
              className="overflow-hidden rounded-2xl border border-neutral-200"
              style={{ borderCurve: "continuous" }}
            >
              <View className="bg-neutral-50 px-3 py-2">
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    selectable
                    className="flex-1 text-sm font-semibold text-neutral-900"
                  >
                    {category.name}
                  </Text>
                  <Pressable
                    onPress={() => screen.confirmArchiveCategory(category._id)}
                    disabled={screen.isArchivingCategory}
                    className={`rounded-full px-3 py-1 ${
                      screen.isArchivingCategory ? "bg-red-50" : "bg-red-100"
                    }`}
                    style={{ borderCurve: "continuous" }}
                  >
                    <Text
                      selectable
                      className={`text-xs font-semibold ${
                        screen.isArchivingCategory
                          ? "text-red-400"
                          : "text-red-700"
                      }`}
                    >
                      Slet kategori
                    </Text>
                  </Pressable>
                </View>
              </View>
              {category.services.length === 0 ? (
                <Text selectable className="px-3 py-3 text-xs text-neutral-500">
                  Ingen services i denne kategori endnu.
                </Text>
              ) : (
                category.services.map((service, index) => (
                  <View key={service._id}>
                    <View className="gap-1 bg-white px-3 py-3">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text
                          selectable
                          className="flex-1 text-sm font-semibold text-neutral-900"
                        >
                          {service.name}
                        </Text>
                        <Text
                          selectable
                          className="text-sm font-semibold text-neutral-900"
                        >
                          {formatMoney(service.priceDkk)}
                        </Text>
                      </View>
                      <Text selectable className="text-xs text-neutral-500">
                        {service.durationMinutes} min · Buffer{" "}
                        {service.bufferBeforeMinutes}/
                        {service.bufferAfterMinutes}
                      </Text>
                      {service.description ? (
                        <Text selectable className="text-xs text-neutral-500">
                          {service.description}
                        </Text>
                      ) : null}
                      <Pressable
                        onPress={() =>
                          screen.confirmArchiveService(
                            service._id as Id<"services">,
                          )
                        }
                        disabled={screen.archivingServiceId === service._id}
                        className={`self-start rounded-full px-3 py-1 ${
                          screen.archivingServiceId === service._id
                            ? "bg-red-50"
                            : "bg-red-100"
                        }`}
                        style={{ borderCurve: "continuous" }}
                      >
                        <Text
                          selectable
                          className={`text-xs font-semibold ${
                            screen.archivingServiceId === service._id
                              ? "text-red-400"
                              : "text-red-700"
                          }`}
                        >
                          {screen.archivingServiceId === service._id
                            ? "Sletter..."
                            : "Slet service"}
                        </Text>
                      </Pressable>
                    </View>
                    {index < category.services.length - 1 ? (
                      <View className="h-px bg-neutral-200" />
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
