import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import {
  AdminButton,
  AdminEmptyState,
  AdminPillGroup,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import { Link } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

type ServiceFormState = {
  name: string;
  description: string;
  durationMinutes: string;
  priceDkk: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
};

const INITIAL_FORM: ServiceFormState = {
  name: "",
  description: "",
  durationMinutes: "",
  priceDkk: "",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "0",
};

function sanitizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminServicesScreen() {
  const salons = useQuery(api.salons.listActive);
  const createCategory = useMutation(api.services.createCategory);
  const createService = useMutation(api.services.createService);
  const archiveCategory = useMutation(api.services.archiveCategory);
  const archiveService = useMutation(api.services.archiveService);

  const [selectedSalonId, setSelectedSalonId] = useState<Id<"salons"> | null>(
    null,
  );
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<Id<"serviceCategories"> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [serviceForm, setServiceForm] =
    useState<ServiceFormState>(INITIAL_FORM);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [isArchivingCategory, setIsArchivingCategory] = useState(false);
  const [archivingServiceId, setArchivingServiceId] =
    useState<Id<"services"> | null>(null);

  useEffect(() => {
    if (!salons || salons.length === 0) {
      setSelectedSalonId(null);
      return;
    }

    setSelectedSalonId((current) =>
      current && salons.some((salon) => salon._id === current)
        ? current
        : salons[0]._id,
    );
  }, [salons]);

  const categories = useQuery(
    api.services.listBySalon,
    selectedSalonId ? { salonId: selectedSalonId, activeOnly: true } : "skip",
  );

  useEffect(() => {
    const list = categories ?? [];
    if (list.length === 0) {
      setSelectedCategoryId(null);
      return;
    }

    setSelectedCategoryId((current) =>
      current && list.some((category) => category._id === current)
        ? current
        : list[0]._id,
    );
  }, [categories]);

  const metrics = useMemo(() => {
    const list = categories ?? [];
    return {
      categoryCount: list.length,
      serviceCount: list.reduce(
        (sum, category) => sum + category.services.length,
        0,
      ),
    };
  }, [categories]);

  if (!salons || (selectedSalonId && categories === undefined)) {
    return <LoadingView />;
  }

  async function handleCreateCategory() {
    if (!selectedSalonId) {
      Alert.alert("Vælg salon", "Vælg en salon før du opretter kategori.");
      return;
    }
    if (!newCategoryName.trim()) {
      Alert.alert("Manglende navn", "Indtast kategorinavn.");
      return;
    }

    try {
      setIsCreatingCategory(true);
      const categoryId = await createCategory({
        salonId: selectedSalonId,
        name: newCategoryName.trim(),
      });
      setNewCategoryName("");
      setSelectedCategoryId(categoryId);
      Alert.alert("Kategori oprettet", "Kategorien er nu klar til services.");
    } catch (error) {
      Alert.alert("Kunne ikke oprette kategori", String(error));
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function handleCreateService() {
    if (!selectedSalonId || !selectedCategoryId) {
      Alert.alert("Manglende data", "Vælg salon og kategori først.");
      return;
    }
    if (!serviceForm.name.trim()) {
      Alert.alert("Manglende navn", "Indtast servicenavn.");
      return;
    }

    const durationMinutes = Number(serviceForm.durationMinutes);
    const priceDkk = Number(serviceForm.priceDkk);
    const bufferBeforeMinutes = Number(serviceForm.bufferBeforeMinutes || "0");
    const bufferAfterMinutes = Number(serviceForm.bufferAfterMinutes || "0");

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      Alert.alert("Ugyldig varighed", "Varighed skal være større end 0.");
      return;
    }
    if (!Number.isFinite(priceDkk) || priceDkk < 0) {
      Alert.alert("Ugyldig pris", "Pris skal være 0 eller højere.");
      return;
    }
    if (
      !Number.isFinite(bufferBeforeMinutes) ||
      !Number.isFinite(bufferAfterMinutes) ||
      bufferBeforeMinutes < 0 ||
      bufferAfterMinutes < 0
    ) {
      Alert.alert("Ugyldig buffer", "Buffer skal være 0 eller højere.");
      return;
    }

    try {
      setIsCreatingService(true);
      await createService({
        salonId: selectedSalonId,
        categoryId: selectedCategoryId,
        name: serviceForm.name.trim(),
        description: sanitizeOptional(serviceForm.description),
        durationMinutes: Math.round(durationMinutes),
        priceDkk: Math.round(priceDkk),
        bufferBeforeMinutes: Math.round(bufferBeforeMinutes),
        bufferAfterMinutes: Math.round(bufferAfterMinutes),
      });

      setServiceForm(INITIAL_FORM);
      Alert.alert("Service oprettet", "Servicen er nu gemt i systemet.");
    } catch (error) {
      Alert.alert("Kunne ikke oprette service", String(error));
    } finally {
      setIsCreatingService(false);
    }
  }

  function confirmArchiveCategory(categoryId: Id<"serviceCategories">) {
    if (!selectedSalonId || isArchivingCategory) {
      return;
    }

    Alert.alert(
      "Slet kategori",
      "Kategorien og alle services i kategorien bliver deaktiveret. Fortsæt?",
      [
        { text: "Annuller", style: "cancel" },
        {
          text: "Slet",
          style: "destructive",
          onPress: () => {
            void handleArchiveCategory(categoryId);
          },
        },
      ],
    );
  }

  async function handleArchiveCategory(categoryId: Id<"serviceCategories">) {
    if (!selectedSalonId) {
      return;
    }

    try {
      setIsArchivingCategory(true);
      await archiveCategory({ salonId: selectedSalonId, categoryId });
      Alert.alert("Kategori slettet", "Kategorien er fjernet fra aktive data.");
    } catch (error) {
      Alert.alert("Kunne ikke slette kategori", String(error));
    } finally {
      setIsArchivingCategory(false);
    }
  }

  function confirmArchiveService(serviceId: Id<"services">) {
    if (!selectedSalonId || archivingServiceId) {
      return;
    }

    Alert.alert("Slet service", "Servicen deaktiveres og skjules i systemet.", [
      { text: "Annuller", style: "cancel" },
      {
        text: "Slet",
        style: "destructive",
        onPress: () => {
          void handleArchiveService(serviceId);
        },
      },
    ]);
  }

  async function handleArchiveService(serviceId: Id<"services">) {
    if (!selectedSalonId) {
      return;
    }

    try {
      setArchivingServiceId(serviceId);
      await archiveService({ salonId: selectedSalonId, serviceId });
      Alert.alert("Service slettet", "Servicen er fjernet fra aktive data.");
    } catch (error) {
      Alert.alert("Kunne ikke slette service", String(error));
    } finally {
      setArchivingServiceId(null);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-[#f5f5f7]"
      contentContainerClassName="mx-auto w-full max-w-6xl gap-5 px-4 pb-20"
    >
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
            selected={selectedSalonId ?? salons[0]._id}
            onSelect={(value) => setSelectedSalonId(value)}
          />
        )}
      </View>

      <View
        className="rounded-3xl border border-neutral-200 bg-white px-4 py-2"
        style={{ borderCurve: "continuous" }}
      >
        <View className="flex-row items-center justify-between py-3">
          <Text selectable className="text-sm text-neutral-600">
            Kategorier
          </Text>
          <Text
            selectable
            className="text-sm font-semibold text-neutral-900"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {String(metrics.categoryCount)}
          </Text>
        </View>
        <View className="h-px bg-neutral-200" />
        <View className="flex-row items-center justify-between py-3">
          <Text selectable className="text-sm text-neutral-600">
            Services
          </Text>
          <Text
            selectable
            className="text-sm font-semibold text-neutral-900"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {String(metrics.serviceCount)}
          </Text>
        </View>
      </View>

      <View
        className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-lg font-semibold text-neutral-950">
          Opret kategori
        </Text>
        <AdminTextField
          label="Kategorinavn"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          placeholder="Klipninger"
        />
        <AdminButton
          title={isCreatingCategory ? "Opretter kategori..." : "Opret kategori"}
          onPress={handleCreateCategory}
          disabled={isCreatingCategory || !selectedSalonId}
        />
      </View>

      <View
        className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-lg font-semibold text-neutral-950">
          Opret service
        </Text>
        {!categories || categories.length === 0 ? (
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
                options={categories.map((category) => ({
                  label: category.name,
                  value: category._id,
                }))}
                selected={selectedCategoryId ?? categories[0]._id}
                onSelect={(value) => setSelectedCategoryId(value)}
              />
            </View>
            <AdminTextField
              label="Servicenavn"
              value={serviceForm.name}
              onChangeText={(value) =>
                setServiceForm((current) => ({ ...current, name: value }))
              }
              placeholder="Herreklip"
            />
            <AdminTextField
              label="Beskrivelse"
              value={serviceForm.description}
              onChangeText={(value) =>
                setServiceForm((current) => ({
                  ...current,
                  description: value,
                }))
              }
              placeholder="Kort beskrivelse af servicen"
              multiline
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AdminTextField
                  label="Varighed (min)"
                  value={serviceForm.durationMinutes}
                  onChangeText={(value) =>
                    setServiceForm((current) => ({
                      ...current,
                      durationMinutes: value,
                    }))
                  }
                  placeholder="30"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <AdminTextField
                  label="Pris (DKK)"
                  value={serviceForm.priceDkk}
                  onChangeText={(value) =>
                    setServiceForm((current) => ({
                      ...current,
                      priceDkk: value,
                    }))
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
                  value={serviceForm.bufferBeforeMinutes}
                  onChangeText={(value) =>
                    setServiceForm((current) => ({
                      ...current,
                      bufferBeforeMinutes: value,
                    }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <AdminTextField
                  label="Buffer efter (min)"
                  value={serviceForm.bufferAfterMinutes}
                  onChangeText={(value) =>
                    setServiceForm((current) => ({
                      ...current,
                      bufferAfterMinutes: value,
                    }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <AdminButton
              title={
                isCreatingService ? "Opretter service..." : "Opret service"
              }
              onPress={handleCreateService}
              disabled={isCreatingService || !selectedSalonId}
            />
          </>
        )}
      </View>

      <View
        className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-lg font-semibold text-neutral-950">
          Services i valgt salon
        </Text>
        {!categories || categories.length === 0 ? (
          <AdminEmptyState
            title="Ingen services endnu"
            description="Når du opretter services, vises de her pr. kategori."
          />
        ) : (
          <View className="gap-3">
            {categories.map((category) => (
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
                      onPress={() => confirmArchiveCategory(category._id)}
                      disabled={isArchivingCategory}
                      className={`rounded-full px-3 py-1 ${
                        isArchivingCategory ? "bg-red-50" : "bg-red-100"
                      }`}
                      style={{ borderCurve: "continuous" }}
                    >
                      <Text
                        selectable
                        className={`text-xs font-semibold ${
                          isArchivingCategory ? "text-red-400" : "text-red-700"
                        }`}
                      >
                        Slet kategori
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {category.services.length === 0 ? (
                  <Text
                    selectable
                    className="px-3 py-3 text-xs text-neutral-500"
                  >
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
                          onPress={() => confirmArchiveService(service._id)}
                          disabled={archivingServiceId === service._id}
                          className={`self-start rounded-full px-3 py-1 ${
                            archivingServiceId === service._id
                              ? "bg-red-50"
                              : "bg-red-100"
                          }`}
                          style={{ borderCurve: "continuous" }}
                        >
                          <Text
                            selectable
                            className={`text-xs font-semibold ${
                              archivingServiceId === service._id
                                ? "text-red-400"
                                : "text-red-700"
                            }`}
                          >
                            {archivingServiceId === service._id
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
    </ScrollView>
  );
}
