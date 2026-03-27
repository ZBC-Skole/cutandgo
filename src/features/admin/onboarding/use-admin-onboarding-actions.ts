import type { Id } from "@/convex/_generated/dataModel";
import { createSlugFromName } from "@/features/admin/onboarding/lib";
import type {
  DayDraft,
  EmployeeAssignRole,
} from "@/features/admin/onboarding/types";
import * as Location from "expo-location";
import { Alert } from "react-native";

type SalonForm = {
  name: string;
  slug: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  latitude: string;
  longitude: string;
};

type EmployeeForm = {
  fullName: string;
  email: string;
  phone: string;
};

type CategoryForm = {
  name: string;
  displayOrder: string;
};

type ServiceForm = {
  name: string;
  durationMinutes: string;
  priceDkk: string;
};

type AdminOnboardingActionsArgs = {
  addressQuery: string;
  setAddressSearchFeedback: (value: string | null) => void;
  setIsUsingCurrentLocation: (value: boolean) => void;
  setIsSearchingAddress: (value: boolean) => void;
  salonForm: SalonForm;
  setSalonForm: (updater: (previous: SalonForm) => SalonForm) => void;
  isSlugManuallyEdited: boolean;
  setIsSlugManuallyEdited: (value: boolean) => void;
  selectedSalonId: Id<"salons"> | null;
  setSelectedSalonId: (value: Id<"salons"> | null) => void;
  selectedEmployeeId: Id<"employees"> | null;
  setSelectedEmployeeId: (value: Id<"employees"> | null) => void;
  selectedAssignRole: EmployeeAssignRole;
  selectedCategoryId: Id<"serviceCategories"> | null;
  setSelectedCategoryId: (value: Id<"serviceCategories"> | null) => void;
  salonWeek: DayDraft[];
  employeeWeek: DayDraft[];
  employeeForm: EmployeeForm;
  categoryForm: CategoryForm;
  setCategoryForm: (value: CategoryForm) => void;
  serviceForm: ServiceForm;
  createSalon: (args: {
    name: string;
    slug: string;
    addressLine1: string;
    postalCode: string;
    city: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  }) => Promise<Id<"salons">>;
  setSalonOpeningHours: (args: {
    salonId: Id<"salons">;
    entries: {
      weekday: number;
      opensAt: string;
      closesAt: string;
      isClosed: boolean;
    }[];
  }) => Promise<unknown>;
  createEmployee: (args: {
    fullName: string;
    email: string;
    phone?: string;
  }) => Promise<{
    employeeId: Id<"employees">;
    temporaryPin: string;
    email: string;
  }>;
  assignEmployee: (args: {
    employeeId: Id<"employees">;
    salonId: Id<"salons">;
    role: EmployeeAssignRole;
  }) => Promise<unknown>;
  setWorkingHours: (args: {
    employeeId: Id<"employees">;
    salonId: Id<"salons">;
    entries: {
      weekday: number;
      startAt: string;
      endAt: string;
      isOff: boolean;
    }[];
  }) => Promise<unknown>;
  createCategory: (args: {
    salonId: Id<"salons">;
    name: string;
    displayOrder?: number;
  }) => Promise<Id<"serviceCategories">>;
  createService: (args: {
    salonId: Id<"salons">;
    categoryId: Id<"serviceCategories">;
    name: string;
    durationMinutes: number;
    priceDkk: number;
  }) => Promise<unknown>;
};

export function createAdminOnboardingActions(args: AdminOnboardingActionsArgs) {
  function updateSalonName(value: string) {
    args.setSalonForm((previous) => ({
      ...previous,
      name: value,
      slug: args.isSlugManuallyEdited
        ? previous.slug
        : createSlugFromName(value),
    }));
  }

  function updateSalonSlug(value: string) {
    args.setIsSlugManuallyEdited(true);
    args.setSalonForm((previous) => ({ ...previous, slug: value }));
  }

  function applyLocation(next: {
    latitude: number;
    longitude: number;
    addressLine1: string;
    postalCode: string;
    city: string;
    countryCode: string;
  }) {
    args.setSalonForm((previous) => ({
      ...previous,
      latitude: next.latitude.toFixed(6),
      longitude: next.longitude.toFixed(6),
      addressLine1: next.addressLine1 || previous.addressLine1,
      postalCode: next.postalCode || previous.postalCode,
      city: next.city || previous.city,
      countryCode: next.countryCode || previous.countryCode,
    }));
  }

  async function onUseCurrentLocation() {
    try {
      args.setIsUsingCurrentLocation(true);
      args.setAddressSearchFeedback(null);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Lokation ikke tilladt",
          "Giv adgang til lokation i appen.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const reverse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const address = reverse[0];

      applyLocation({
        latitude,
        longitude,
        addressLine1:
          address?.street && address?.streetNumber
            ? `${address.street} ${address.streetNumber}`.trim()
            : "Min nuværende lokation",
        postalCode: address?.postalCode ?? "",
        city: address?.city ?? address?.subregion ?? "",
        countryCode: address?.isoCountryCode ?? "DK",
      });
      args.setAddressSearchFeedback("Lokation fundet fra mobilen.");
    } catch (error) {
      Alert.alert("Kunne ikke hente lokation", String(error));
    } finally {
      args.setIsUsingCurrentLocation(false);
    }
  }

  async function onSearchAddress() {
    const query = args.addressQuery.trim();
    if (query.length < 3) {
      args.setAddressSearchFeedback("Skriv mindst 3 tegn for at søge.");
      return;
    }

    try {
      args.setIsSearchingAddress(true);
      args.setAddressSearchFeedback(null);
      const geocode = await Location.geocodeAsync(query);
      const first = geocode[0];
      if (!first) {
        args.setAddressSearchFeedback(
          "Ingen resultater. Prøv en mere præcis adresse.",
        );
        return;
      }

      const reverse = await Location.reverseGeocodeAsync({
        latitude: first.latitude,
        longitude: first.longitude,
      });
      const address = reverse[0];

      applyLocation({
        latitude: first.latitude,
        longitude: first.longitude,
        addressLine1:
          address?.street && address?.streetNumber
            ? `${address.street} ${address.streetNumber}`.trim()
            : query,
        postalCode: address?.postalCode ?? "",
        city: address?.city ?? address?.subregion ?? "",
        countryCode: address?.isoCountryCode ?? "DK",
      });
      args.setAddressSearchFeedback("Adresse fundet.");
    } catch (error) {
      Alert.alert("Søgning fejlede", String(error));
    } finally {
      args.setIsSearchingAddress(false);
    }
  }

  async function onCreateSalon() {
    if (!args.salonForm.name.trim() || !args.salonForm.slug.trim()) {
      Alert.alert("Manglende data", "Udfyld mindst navn og slug.");
      return null;
    }
    if (!args.salonForm.latitude || !args.salonForm.longitude) {
      Alert.alert(
        "Manglende lokation",
        "Brug 'Find adresse' eller 'Brug min lokation' først.",
      );
      return null;
    }

    try {
      const id = await args.createSalon({
        name: args.salonForm.name.trim(),
        slug: args.salonForm.slug.trim().toLowerCase(),
        addressLine1: args.salonForm.addressLine1.trim() || "Ikke sat",
        postalCode: args.salonForm.postalCode.trim() || "0000",
        city: args.salonForm.city.trim() || "Ikke sat",
        countryCode: args.salonForm.countryCode.trim().toUpperCase() || "DK",
        latitude: Number(args.salonForm.latitude || "0"),
        longitude: Number(args.salonForm.longitude || "0"),
      });
      args.setSelectedSalonId(id);
      return id;
    } catch (error) {
      Alert.alert("Kunne ikke oprette salon", String(error));
      return null;
    }
  }

  async function onSaveSalonOpeningHours() {
    if (!args.selectedSalonId) {
      return false;
    }

    try {
      await args.setSalonOpeningHours({
        salonId: args.selectedSalonId,
        entries: args.salonWeek.map((row) => ({
          weekday: row.weekday,
          opensAt: row.opensAt,
          closesAt: row.closesAt,
          isClosed: row.isClosed,
        })),
      });
      return true;
    } catch (error) {
      Alert.alert("Kunne ikke gemme åbningstider", String(error));
      return false;
    }
  }

  async function onCreateEmployee(): Promise<Id<"employees"> | null> {
    if (!args.employeeForm.fullName.trim()) {
      Alert.alert("Manglende data", "Indtast navn på medarbejder.");
      return null;
    }
    if (!args.employeeForm.email.trim()) {
      Alert.alert("Manglende data", "Indtast email på medarbejder.");
      return null;
    }

    try {
      const created = await args.createEmployee({
        fullName: args.employeeForm.fullName.trim(),
        email: args.employeeForm.email.trim(),
        phone: args.employeeForm.phone.trim() || undefined,
      });
      args.setSelectedEmployeeId(created.employeeId);
      Alert.alert(
        "Medarbejder oprettet",
        `Login email: ${created.email}\nMidlertidig PIN: ${created.temporaryPin}\n\nDel PIN sikkert. Medarbejderen bliver bedt om at vælge ny adgangskode ved første login.`,
      );
      return created.employeeId;
    } catch (error) {
      Alert.alert("Kunne ikke oprette ansat", String(error));
      return null;
    }
  }

  async function onAssignEmployee(employeeId: Id<"employees">) {
    if (!args.selectedSalonId) {
      return false;
    }

    try {
      await args.assignEmployee({
        employeeId,
        salonId: args.selectedSalonId,
        role: args.selectedAssignRole,
      });
      return true;
    } catch (error) {
      Alert.alert("Kunne ikke tilknytte ansat", String(error));
      return false;
    }
  }

  async function onSaveEmployeeHours() {
    if (!args.selectedEmployeeId || !args.selectedSalonId) {
      return false;
    }

    try {
      await args.setWorkingHours({
        employeeId: args.selectedEmployeeId,
        salonId: args.selectedSalonId,
        entries: args.employeeWeek.map((row) => ({
          weekday: row.weekday,
          startAt: row.opensAt,
          endAt: row.closesAt,
          isOff: row.isClosed,
        })),
      });
      return true;
    } catch (error) {
      Alert.alert("Kunne ikke gemme arbejdstider", String(error));
      return false;
    }
  }

  async function onCreateCategory() {
    if (!args.selectedSalonId) {
      return null;
    }
    if (!args.categoryForm.name.trim()) {
      return args.selectedCategoryId;
    }

    try {
      const id = await args.createCategory({
        salonId: args.selectedSalonId,
        name: args.categoryForm.name.trim(),
        displayOrder: args.categoryForm.displayOrder
          ? Number(args.categoryForm.displayOrder)
          : undefined,
      });
      args.setSelectedCategoryId(id);
      args.setCategoryForm({ name: "", displayOrder: "" });
      return id;
    } catch (error) {
      Alert.alert("Kunne ikke oprette kategori", String(error));
      return null;
    }
  }

  async function onCreateService(categoryId: Id<"serviceCategories">) {
    if (!args.selectedSalonId || !args.serviceForm.name.trim()) {
      Alert.alert("Manglende data", "Vælg kategori og service-navn.");
      return false;
    }

    try {
      await args.createService({
        salonId: args.selectedSalonId,
        categoryId,
        name: args.serviceForm.name.trim(),
        durationMinutes: Number(args.serviceForm.durationMinutes),
        priceDkk: Number(args.serviceForm.priceDkk),
      });
      return true;
    } catch (error) {
      Alert.alert("Kunne ikke oprette service", String(error));
      return false;
    }
  }

  return {
    updateSalonName,
    updateSalonSlug,
    onUseCurrentLocation,
    onSearchAddress,
    onCreateSalon,
    onSaveSalonOpeningHours,
    onCreateEmployee,
    onAssignEmployee,
    onSaveEmployeeHours,
    onCreateCategory,
    onCreateService,
  };
}
