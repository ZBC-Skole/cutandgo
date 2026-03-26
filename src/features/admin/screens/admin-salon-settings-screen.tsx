import { api } from "@/convex/_generated/api";
import {
  AdminBadge,
  AdminButton,
  AdminDayScheduleEditor,
  AdminEmptyState,
  AdminHero,
  AdminListItem,
  AdminSection,
  AdminShortcutCard,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import {
  createDefaultWeek,
  createSlugFromName,
} from "@/features/admin/onboarding/lib";
import type { DayDraft } from "@/features/admin/onboarding/types";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";

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

export function AdminSalonSettingsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const salons = useQuery(api.salons.listActive) ?? [];
  const createSalonWithOpeningHours = useMutation(
    api.salons.createWithOpeningHours,
  );
  const [form, setForm] = useState<SalonFormState>(INITIAL_FORM);
  const [openingWeek, setOpeningWeek] =
    useState<DayDraft[]>(createDefaultWeek());
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isCompact = width < 900;

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
      setSuccessMessage(
        `${createdSalonName} er nu oprettet med basis-åbningstider og klar til drift.`,
      );
      Alert.alert(
        "Salon oprettet",
        "Den nye salon og dens åbningstider er nu aktive i admin.",
      );
    } catch (error) {
      Alert.alert("Kunne ikke oprette salon", String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-stone-100"
      contentContainerClassName="mx-auto w-full max-w-6xl gap-5 p-4 pb-16"
    >
      <AdminHero
        eyebrow="Admin indstillinger"
        title="Opret salon med adresse, kontaktdata og åbningstider"
        description="Salonoprettelse ligger bevidst i indstillinger, så det daglige adminarbejde holdes adskilt fra strukturelle ændringer i forretningen."
      >
        <View className={`gap-3 ${isCompact ? "" : "flex-row"}`}>
          <AdminShortcutCard
            href="/admin"
            title="Til statistik"
            description="Gå tilbage til dashboardet og se den nye salon indgå i admin-overblikket."
            cta="Åbn statistik"
          />
          <AdminShortcutCard
            href="/employees"
            title="Til medarbejdere"
            description="Når salonen er oprettet, kan teamet knyttes til den direkte fra medarbejder-siden."
            cta="Åbn medarbejdere"
          />
        </View>
      </AdminHero>

      {successMessage ? (
        <AdminSection
          eyebrow="Succes"
          title="Salonoprettelsen gik igennem"
          description={successMessage}
        >
          <View className="gap-3">
            <AdminBadge
              label="Klar til statistik og team-setup"
              tone="success"
            />
            <AdminButton
              title="Gå til statistik"
              onPress={() => {
                setSuccessMessage(null);
                router.push("/admin");
              }}
              variant="secondary"
            />
          </View>
        </AdminSection>
      ) : null}

      <AdminSection
        eyebrow="Trin 1"
        title="Salon-stamdata"
        description="Først indtastes navne-, adresse- og kontaktoplysninger. Lokationen kan findes via søgning eller enhedens nuværende position."
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
          </View>
        </View>

        <View
          className="gap-2 rounded-[24px] border border-dashed border-neutral-300 bg-neutral-50 p-4"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-sm font-semibold text-neutral-950">
            Valgt lokation
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            {form.addressLine1 || "Ingen adresse valgt endnu"}
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            {[form.postalCode, form.city].filter(Boolean).join(" ") ||
              "By og postnummer mangler"}
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            {form.latitude && form.longitude
              ? `${form.latitude}, ${form.longitude}`
              : "Koordinater ikke valgt endnu"}
          </Text>
          {feedback ? (
            <Text selectable className="text-sm font-medium text-neutral-700">
              {feedback}
            </Text>
          ) : null}
        </View>
      </AdminSection>

      <AdminSection
        eyebrow="Trin 2"
        title="Åbningstider"
        description="Disse åbningstider gemmes sammen med salonoprettelsen, så setup ikke ender i to adskilte trin."
      >
        <AdminDayScheduleEditor rows={openingWeek} onChange={setOpeningWeek} />

        <AdminButton
          title={isSubmitting ? "Opretter salon..." : "Opret salon"}
          onPress={handleCreateSalon}
          disabled={isSubmitting}
        />
      </AdminSection>

      <AdminSection
        eyebrow="Eksisterende saloner"
        title="Aktive saloner i systemet"
        description="Listen gør det nemt at validere, at en ny salon er landet rigtigt efter oprettelsen."
      >
        <View className="gap-3">
          {salons.length === 0 ? (
            <AdminEmptyState
              title="Ingen saloner endnu"
              description="Den første salon oprettes i formularen ovenfor."
            />
          ) : (
            salons.map((salon) => (
              <AdminListItem
                key={salon._id}
                title={salon.name}
                subtitle={`${salon.addressLine1}, ${salon.postalCode} ${salon.city}`}
                meta={salon.slug}
              />
            ))
          )}
        </View>
      </AdminSection>
    </ScrollView>
  );
}
