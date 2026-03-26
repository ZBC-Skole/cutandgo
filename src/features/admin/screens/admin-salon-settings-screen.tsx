import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AdminButton,
  AdminDayScheduleEditor,
  AdminEmptyState,
  AdminListItem,
  AdminSection,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import {
  createDefaultWeek,
  createSlugFromName,
} from "@/features/admin/onboarding/lib";
import type { DayDraft } from "@/features/admin/onboarding/types";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type SalonFormState = {
  name: string;
  slug: string;
  addressQuery: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
};

const INITIAL_FORM: SalonFormState = {
  name: "",
  slug: "",
  addressQuery: "",
  addressLine1: "",
  postalCode: "",
  city: "",
  countryCode: "DK",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
};

function sanitizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toWeekDraft(
  rows:
    | {
        weekday: number;
        opensAt: string;
        closesAt: string;
        isClosed?: boolean;
      }[]
    | undefined,
) {
  const base = createDefaultWeek();
  if (!rows || rows.length === 0) {
    return base;
  }

  return base.map((day) => {
    const match = rows.find((row) => row.weekday === day.weekday);
    if (!match) {
      return day;
    }
    return {
      weekday: day.weekday,
      opensAt: match.opensAt,
      closesAt: match.closesAt,
      isClosed: match.isClosed ?? false,
    };
  });
}

export function AdminSalonSettingsScreen() {
  const { width } = useWindowDimensions();
  const salonsQuery = useQuery(api.salons.listActive);
  const salons = useMemo(() => salonsQuery ?? [], [salonsQuery]);
  const createSalonWithOpeningHours = useMutation(
    api.salons.createWithOpeningHours,
  );
  const setOpeningHours = useMutation(api.salons.setOpeningHours);
  const [form, setForm] = useState<SalonFormState>(INITIAL_FORM);
  const [openingWeek, setOpeningWeek] =
    useState<DayDraft[]>(createDefaultWeek());
  const [selectedExistingSalonId, setSelectedExistingSalonId] =
    useState<Id<"salons"> | null>(null);
  const [existingOpeningWeek, setExistingOpeningWeek] =
    useState<DayDraft[]>(createDefaultWeek());
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingExistingHours, setIsSavingExistingHours] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [existingHoursFeedback, setExistingHoursFeedback] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const isCompact = width < 900;
  const existingOpeningHours = useQuery(
    api.salons.getOpeningHours,
    selectedExistingSalonId ? { salonId: selectedExistingSalonId } : "skip",
  );

  useEffect(() => {
    if (salons.length === 0) {
      setSelectedExistingSalonId(null);
      return;
    }

    setSelectedExistingSalonId((current) =>
      current && salons.some((salon) => salon._id === current)
        ? current
        : salons[0]._id,
    );
  }, [salons]);

  useEffect(() => {
    setExistingOpeningWeek(toWeekDraft(existingOpeningHours));
  }, [existingOpeningHours]);

  function patchForm(patch: Partial<SalonFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateSalonName(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: isSlugManuallyEdited ? current.slug : createSlugFromName(value),
    }));
  }

  function updateSalonSlug(value: string) {
    setIsSlugManuallyEdited(true);
    patchForm({ slug: createSlugFromName(value) });
  }

  function applyLocation(args: {
    latitude: number;
    longitude: number;
    addressLine1: string;
    postalCode: string;
    city: string;
    countryCode: string;
  }) {
    patchForm({
      latitude: args.latitude.toFixed(6),
      longitude: args.longitude.toFixed(6),
      addressLine1: args.addressLine1,
      postalCode: args.postalCode,
      city: args.city,
      countryCode: args.countryCode,
    });
  }

  async function handleSearchAddress() {
    const query = form.addressQuery.trim();
    if (query.length < 3) {
      setFeedback("Skriv mindst 3 tegn for at søge på adressen.");
      return;
    }

    try {
      setIsSearchingAddress(true);
      setFeedback(null);
      const geocode = await Location.geocodeAsync(query);
      const firstMatch = geocode[0];

      if (!firstMatch) {
        setFeedback("Ingen adresse fundet. Prøv en mere præcis søgning.");
        return;
      }

      const reverse = await Location.reverseGeocodeAsync({
        latitude: firstMatch.latitude,
        longitude: firstMatch.longitude,
      });
      const address = reverse[0];

      applyLocation({
        latitude: firstMatch.latitude,
        longitude: firstMatch.longitude,
        addressLine1:
          address?.street && address?.streetNumber
            ? `${address.street} ${address.streetNumber}`.trim()
            : query,
        postalCode: address?.postalCode ?? "",
        city: address?.city ?? address?.subregion ?? "",
        countryCode: address?.isoCountryCode ?? "DK",
      });
      setFeedback("Adresse fundet og udfyldt.");
    } catch (error) {
      Alert.alert("Adresseopslag fejlede", String(error));
    } finally {
      setIsSearchingAddress(false);
    }
  }

  async function handleUseCurrentLocation() {
    try {
      setIsUsingCurrentLocation(true);
      setFeedback(null);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Lokation mangler", "Giv appen adgang til lokation først.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const reverse = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const address = reverse[0];

      applyLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        addressLine1:
          address?.street && address?.streetNumber
            ? `${address.street} ${address.streetNumber}`.trim()
            : "Min nuværende lokation",
        postalCode: address?.postalCode ?? "",
        city: address?.city ?? address?.subregion ?? "",
        countryCode: address?.isoCountryCode ?? "DK",
      });
      setFeedback("Lokation hentet fra enheden.");
    } catch (error) {
      Alert.alert("Kunne ikke hente lokation", String(error));
    } finally {
      setIsUsingCurrentLocation(false);
    }
  }

  async function handleCreateSalon() {
    if (!form.name.trim() || !form.slug.trim()) {
      Alert.alert("Manglende data", "Udfyld mindst navn og slug.");
      return;
    }

    if (!form.latitude || !form.longitude) {
      Alert.alert(
        "Manglende lokation",
        "Find adressen eller brug din nuværende lokation først.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await createSalonWithOpeningHours({
        salon: {
          name: form.name.trim(),
          slug: form.slug.trim(),
          addressLine1: form.addressLine1.trim() || "Ikke sat",
          addressLine2: undefined,
          postalCode: form.postalCode.trim() || "0000",
          city: form.city.trim() || "Ikke sat",
          countryCode: form.countryCode.trim().toUpperCase() || "DK",
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          phone: sanitizeOptional(form.phone),
          email: sanitizeOptional(form.email),
        },
        openingHours: openingWeek.map((row) => ({
          weekday: row.weekday,
          opensAt: row.opensAt,
          closesAt: row.closesAt,
          isClosed: row.isClosed,
        })),
      });

      const createdSalonName = form.name.trim();
      setForm(INITIAL_FORM);
      setOpeningWeek(createDefaultWeek());
      setIsSlugManuallyEdited(false);
      setFeedback("Salon og åbningstider blev oprettet.");
      setActiveTab("manage");
      Alert.alert(
        "Salon oprettet",
        `${createdSalonName} er nu oprettet og klar.`,
      );
    } catch (error) {
      Alert.alert("Kunne ikke oprette salon", String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveExistingOpeningHours() {
    if (!selectedExistingSalonId) {
      return;
    }

    try {
      setIsSavingExistingHours(true);
      setExistingHoursFeedback(null);
      await setOpeningHours({
        salonId: selectedExistingSalonId,
        entries: existingOpeningWeek.map((row) => ({
          weekday: row.weekday,
          opensAt: row.opensAt,
          closesAt: row.closesAt,
          isClosed: row.isClosed,
        })),
      });
      setExistingHoursFeedback("Åbningstiderne er opdateret.");
      Alert.alert("Gemt", "De nye åbningstider er nu aktive.");
    } catch (error) {
      Alert.alert("Kunne ikke gemme åbningstider", String(error));
    } finally {
      setIsSavingExistingHours(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-16"
    >
      <View className="gap-1 pt-1">
        <Text
          selectable
          className="text-xs uppercase tracking-[2px] text-neutral-500"
        >
          Saloner
        </Text>
        <Text selectable className="text-2xl font-semibold text-neutral-950">
          Salon administration
        </Text>
      </View>

      <View
        className="flex-row rounded-2xl bg-white p-1"
        style={{ borderCurve: "continuous" }}
      >
        <Pressable
          onPress={() => setActiveTab("create")}
          className={`flex-1 rounded-xl px-3 py-2 ${
            activeTab === "create" ? "bg-neutral-900" : "bg-transparent"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className={`text-center text-sm font-semibold ${
              activeTab === "create" ? "text-white" : "text-neutral-700"
            }`}
          >
            Opret salon
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("manage")}
          className={`flex-1 rounded-xl px-3 py-2 ${
            activeTab === "manage" ? "bg-neutral-900" : "bg-transparent"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className={`text-center text-sm font-semibold ${
              activeTab === "manage" ? "text-white" : "text-neutral-700"
            }`}
          >
            Saloner
          </Text>
        </Pressable>
      </View>

      {activeTab === "create" ? (
        <AdminSection
          title="Opret ny salon"
          description="Indtast stamdata og åbningstider i ét simpelt flow."
        >
          <View className={`gap-3 ${isCompact ? "" : "flex-row"}`}>
            <View className="flex-1 gap-3">
              <AdminTextField
                label="Salonnavn"
                value={form.name}
                onChangeText={updateSalonName}
                placeholder="Cut&Go Frederiksberg"
                autoCapitalize="words"
              />
              <AdminTextField
                label="Slug"
                value={form.slug}
                onChangeText={updateSalonSlug}
                placeholder="cutgo-frederiksberg"
                autoCapitalize="none"
              />
              <AdminTextField
                label="Søg adresse"
                value={form.addressQuery}
                onChangeText={(value) => patchForm({ addressQuery: value })}
                placeholder="Fx Falkoner Alle 21, Frederiksberg"
              />
              <View className={`gap-3 ${width < 640 ? "" : "flex-row"}`}>
                <View className="flex-1">
                  <AdminButton
                    title={
                      isSearchingAddress ? "Søger adresse..." : "Find adresse"
                    }
                    onPress={handleSearchAddress}
                    variant="secondary"
                    disabled={isSearchingAddress || isSubmitting}
                  />
                </View>
                <View className="flex-1">
                  <AdminButton
                    title={
                      isUsingCurrentLocation
                        ? "Henter lokation..."
                        : "Brug min lokation"
                    }
                    onPress={handleUseCurrentLocation}
                    variant="secondary"
                    disabled={isUsingCurrentLocation || isSubmitting}
                  />
                </View>
              </View>
            </View>

            <View className="flex-1 gap-3">
              <AdminTextField
                label="Adresse"
                value={form.addressLine1}
                onChangeText={(value) => patchForm({ addressLine1: value })}
                placeholder="Gadenavn og nummer"
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AdminTextField
                    label="Postnummer"
                    value={form.postalCode}
                    onChangeText={(value) => patchForm({ postalCode: value })}
                    placeholder="2000"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <AdminTextField
                    label="By"
                    value={form.city}
                    onChangeText={(value) => patchForm({ city: value })}
                    placeholder="Frederiksberg"
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AdminTextField
                    label="Telefon"
                    value={form.phone}
                    onChangeText={(value) => patchForm({ phone: value })}
                    placeholder="+45 12 34 56 78"
                    keyboardType="phone-pad"
                  />
                </View>
                <View className="flex-1">
                  <AdminTextField
                    label="Email"
                    value={form.email}
                    onChangeText={(value) => patchForm({ email: value })}
                    placeholder="salon@cutandgo.dk"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View
                className="gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                style={{ borderCurve: "continuous" }}
              >
                <Text
                  selectable
                  className="text-xs font-semibold text-neutral-700"
                >
                  Lokation
                </Text>
                <Text selectable className="text-sm text-neutral-600">
                  {form.addressLine1 || "Ingen adresse valgt"}
                </Text>
                <Text selectable className="text-sm text-neutral-600">
                  {[form.postalCode, form.city].filter(Boolean).join(" ") ||
                    "By og postnummer mangler"}
                </Text>
                <Text selectable className="text-sm text-neutral-600">
                  {form.latitude && form.longitude
                    ? `${form.latitude}, ${form.longitude}`
                    : "Koordinater mangler"}
                </Text>
                {feedback ? (
                  <Text selectable className="text-xs text-neutral-700">
                    {feedback}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text selectable className="text-sm font-semibold text-neutral-950">
              Åbningstider
            </Text>
            <AdminDayScheduleEditor
              rows={openingWeek}
              onChange={setOpeningWeek}
            />
            <AdminButton
              title={isSubmitting ? "Opretter salon..." : "Opret salon"}
              onPress={handleCreateSalon}
              disabled={isSubmitting}
            />
          </View>
        </AdminSection>
      ) : (
        <AdminSection
          title="Eksisterende saloner"
          description="Vælg en salon og opdatér åbningstider."
        >
          <View className={`gap-4 ${isCompact ? "" : "flex-row"}`}>
            <View className="flex-1 gap-3">
              {salons.length === 0 ? (
                <AdminEmptyState
                  title="Ingen saloner endnu"
                  description="Opret din første salon under fanen 'Opret salon'."
                />
              ) : (
                salons.map((salon) => (
                  <AdminListItem
                    key={salon._id}
                    title={salon.name}
                    subtitle={`${salon.addressLine1}, ${salon.postalCode} ${salon.city}`}
                    meta={salon.slug}
                    selected={selectedExistingSalonId === salon._id}
                    onPress={() => {
                      setSelectedExistingSalonId(salon._id);
                      setExistingHoursFeedback(null);
                    }}
                  />
                ))
              )}
            </View>

            <View className="flex-1 gap-3">
              {selectedExistingSalonId ? (
                <>
                  <AdminDayScheduleEditor
                    rows={existingOpeningWeek}
                    onChange={setExistingOpeningWeek}
                  />
                  <AdminButton
                    title={
                      isSavingExistingHours
                        ? "Gemmer åbningstider..."
                        : "Gem åbningstider"
                    }
                    onPress={handleSaveExistingOpeningHours}
                    disabled={isSavingExistingHours}
                  />
                  {existingHoursFeedback ? (
                    <Text selectable className="text-sm text-neutral-700">
                      {existingHoursFeedback}
                    </Text>
                  ) : null}
                </>
              ) : (
                <AdminEmptyState
                  title="Vælg en salon"
                  description="Når en salon er valgt, kan åbningstider redigeres her."
                />
              )}
            </View>
          </View>
        </AdminSection>
      )}
    </ScrollView>
  );
}
