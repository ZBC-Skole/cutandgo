import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  createDefaultWeek,
  createSlugFromName,
} from "@/features/admin/onboarding/lib";
import type { DayDraft } from "@/features/admin/onboarding/types";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

export type SalonFormState = {
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

export const INITIAL_FORM: SalonFormState = {
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

export function useAdminSalonSettingsScreen() {
  const salonsQuery = useQuery(api.backend.domains.salons.index.listActive);
  const salons = useMemo(() => salonsQuery ?? [], [salonsQuery]);
  const createSalonWithOpeningHours = useMutation(
    api.backend.domains.salons.index.createWithOpeningHours,
  );
  const setOpeningHours = useMutation(
    api.backend.domains.salons.index.setOpeningHours,
  );

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

  const existingOpeningHours = useQuery(
    api.backend.domains.salons.index.getOpeningHours,
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

  return {
    salons,
    form,
    patchForm,
    updateSalonName,
    updateSalonSlug,
    openingWeek,
    setOpeningWeek,
    selectedExistingSalonId,
    setSelectedExistingSalonId,
    existingOpeningWeek,
    setExistingOpeningWeek,
    isSearchingAddress,
    isUsingCurrentLocation,
    isSubmitting,
    isSavingExistingHours,
    feedback,
    existingHoursFeedback,
    setExistingHoursFeedback,
    activeTab,
    setActiveTab,
    handleSearchAddress,
    handleUseCurrentLocation,
    handleCreateSalon,
    handleSaveExistingOpeningHours,
  };
}
