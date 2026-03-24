import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type DayDraft = {
  weekday: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

const WEEK_DAYS = [
  { weekday: 0, label: "Søn" },
  { weekday: 1, label: "Man" },
  { weekday: 2, label: "Tir" },
  { weekday: 3, label: "Ons" },
  { weekday: 4, label: "Tor" },
  { weekday: 5, label: "Fre" },
  { weekday: 6, label: "Lør" },
];

const STEPS = [
  "Salon",
  "Åbningstider",
  "Ansatte",
  "Arbejdstider",
  "Services",
] as const;

function createSlugFromName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function createDefaultWeek(): DayDraft[] {
  return WEEK_DAYS.map((item) => ({
    weekday: item.weekday,
    opensAt: "09:00",
    closesAt: "17:00",
    isClosed: item.weekday === 0,
  }));
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="gap-3 rounded-2xl bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <View className="gap-1">
        <Text
          selectable
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text selectable className="text-sm text-neutral-700">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "next" | "search";
}) {
  return (
    <View className="gap-1">
      <Text selectable className="text-xs font-semibold text-neutral-600">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        className="rounded-xl border border-neutral-200 bg-neutral-50 p-3  text-neutral-900"
      />
    </View>
  );
}

function SelectPills<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: T }[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`rounded-full px-3 py-1.5 ${
              isSelected ? "bg-neutral-900" : "bg-neutral-100"
            }`}
            style={{ borderCurve: "continuous" }}
          >
            <Text
              selectable
              className={`text-xs font-semibold ${
                isSelected ? "text-white" : "text-neutral-700"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayEditor({
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
            className="gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2"
            style={{ borderCurve: "continuous" }}
          >
            <View className="flex-row items-center justify-between">
              <Text
                selectable
                className="text-sm font-semibold text-neutral-800"
              >
                {label}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text selectable className="text-xs text-neutral-500">
                  Lukket
                </Text>
                <Switch
                  value={row.isClosed}
                  onValueChange={(value) =>
                    patchRow(row.weekday, { isClosed: value })
                  }
                />
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Field
                  label="Åbner"
                  value={row.opensAt}
                  onChangeText={(value) =>
                    patchRow(row.weekday, { opensAt: value })
                  }
                  placeholder="09:00"
                />
              </View>
              <View className="flex-1">
                <Field
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

function ActionButton({
  title,
  onPress,
  disabled,
  variant = "dark",
}: {
  title: string;
  onPress: () => Promise<void> | void;
  disabled?: boolean;
  variant?: "dark" | "light";
}) {
  const bg =
    variant === "dark"
      ? disabled
        ? "bg-neutral-200"
        : "bg-neutral-900"
      : "bg-neutral-100";
  const text = variant === "dark" ? "text-white" : "text-neutral-900";

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      className={`rounded-xl px-3 py-2 ${bg}`}
      style={{ borderCurve: "continuous" }}
    >
      <Text selectable className={`text-center text-sm font-semibold ${text}`}>
        {title}
      </Text>
    </Pressable>
  );
}

export function AdminScreen() {
  const [stepIndex, setStepIndex] = useState(0);

  const salonsQuery = useQuery(api.salons.listActive);
  const employeesQuery = useQuery(api.staff.listEmployees);

  const [selectedSalonId, setSelectedSalonId] = useState<Id<"salons"> | null>(
    null,
  );
  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<Id<"employees"> | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<Id<"serviceCategories"> | null>(null);
  const [selectedAssignRole, setSelectedAssignRole] = useState<
    "owner" | "manager" | "stylist" | "assistant"
  >("stylist");

  const openingHoursQuery = useQuery(
    api.salons.getOpeningHours,
    selectedSalonId ? { salonId: selectedSalonId } : "skip",
  );
  const workingHoursQuery = useQuery(
    api.staff.getWorkingHours,
    selectedSalonId && selectedEmployeeId
      ? { salonId: selectedSalonId, employeeId: selectedEmployeeId }
      : "skip",
  );
  const categoriesWithServicesQuery = useQuery(
    api.services.listBySalon,
    selectedSalonId ? { salonId: selectedSalonId, activeOnly: false } : "skip",
  );
  const salonEmployeesQuery = useQuery(
    api.staff.listSalonEmployees,
    selectedSalonId ? { salonId: selectedSalonId } : "skip",
  );

  const salons = useMemo(() => salonsQuery ?? [], [salonsQuery]);
  const employees = useMemo(() => employeesQuery ?? [], [employeesQuery]);
  const openingHours = useMemo(
    () => openingHoursQuery ?? [],
    [openingHoursQuery],
  );
  const workingHours = useMemo(
    () => workingHoursQuery ?? [],
    [workingHoursQuery],
  );
  const categoriesWithServices = useMemo(
    () => categoriesWithServicesQuery ?? [],
    [categoriesWithServicesQuery],
  );
  const salonEmployees = useMemo(
    () => salonEmployeesQuery ?? [],
    [salonEmployeesQuery],
  );

  const createSalon = useMutation(api.salons.create);
  const setSalonOpeningHours = useMutation(api.salons.setOpeningHours);
  const createEmployee = useMutation(api.staff.createEmployee);
  const assignEmployee = useMutation(api.staff.assignEmployeeToSalon);
  const setWorkingHours = useMutation(api.staff.setWorkingHours);
  const createCategory = useMutation(api.services.createCategory);
  const createService = useMutation(api.services.createService);

  const [salonWeek, setSalonWeek] = useState<DayDraft[]>(createDefaultWeek());
  const [employeeWeek, setEmployeeWeek] =
    useState<DayDraft[]>(createDefaultWeek());

  const [salonForm, setSalonForm] = useState({
    name: "",
    slug: "",
    addressLine1: "",
    postalCode: "",
    city: "",
    countryCode: "DK",
    latitude: "",
    longitude: "",
  });
  const [addressQuery, setAddressQuery] = useState("");
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSearchFeedback, setAddressSearchFeedback] = useState<
    string | null
  >(null);

  const [employeeForm, setEmployeeForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    displayOrder: "",
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    durationMinutes: "30",
    priceDkk: "300",
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (!selectedSalonId && salons.length > 0) {
      setSelectedSalonId(salons[0]._id);
    }
  }, [salons, selectedSalonId]);

  useEffect(() => {
    if (!selectedEmployeeId && employees.length > 0) {
      setSelectedEmployeeId(employees[0]._id);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (openingHours.length === 0) {
      return;
    }
    const next = createDefaultWeek().map((row) => {
      const found = openingHours.find((entry) => entry.weekday === row.weekday);
      if (!found) {
        return row;
      }
      return {
        weekday: row.weekday,
        opensAt: found.opensAt,
        closesAt: found.closesAt,
        isClosed: found.isClosed,
      };
    });
    setSalonWeek(next);
  }, [openingHours]);

  useEffect(() => {
    if (workingHours.length === 0) {
      setEmployeeWeek(createDefaultWeek());
      return;
    }
    const next = createDefaultWeek().map((row) => {
      const found = workingHours.find((entry) => entry.weekday === row.weekday);
      if (!found) {
        return row;
      }
      return {
        weekday: row.weekday,
        opensAt: found.startAt,
        closesAt: found.endAt,
        isClosed: found.isOff,
      };
    });
    setEmployeeWeek(next);
  }, [workingHours]);

  useEffect(() => {
    if (!selectedCategoryId && categoriesWithServices.length > 0) {
      setSelectedCategoryId(categoriesWithServices[0]._id);
    }
  }, [categoriesWithServices, selectedCategoryId]);

  const selectedSalonAssignedEmployees = useMemo(
    () =>
      selectedSalonId
        ? salonEmployees.filter(
            (item) => item.assignment.salonId === selectedSalonId,
          )
        : [],
    [salonEmployees, selectedSalonId],
  );

  const canContinue = [
    Boolean(
      selectedSalonId ||
      (salonForm.name.trim() &&
        salonForm.slug.trim() &&
        salonForm.latitude &&
        salonForm.longitude),
    ),
    Boolean(selectedSalonId),
    Boolean(
      selectedSalonId && (selectedEmployeeId || employeeForm.fullName.trim()),
    ),
    Boolean(selectedEmployeeId && selectedSalonId),
    Boolean(
      selectedSalonId &&
      serviceForm.name.trim() &&
      (selectedCategoryId || categoryForm.name.trim()),
    ),
  ][stepIndex];

  async function onCreateSalon() {
    if (!salonForm.name.trim() || !salonForm.slug.trim()) {
      Alert.alert("Manglende data", "Udfyld mindst navn og slug.");
      return;
    }
    if (!salonForm.latitude || !salonForm.longitude) {
      Alert.alert(
        "Manglende lokation",
        "Brug 'Find adresse' eller 'Brug min lokation' først.",
      );
      return;
    }

    try {
      const id = await createSalon({
        name: salonForm.name.trim(),
        slug: salonForm.slug.trim().toLowerCase(),
        addressLine1: salonForm.addressLine1.trim() || "Ikke sat",
        postalCode: salonForm.postalCode.trim() || "0000",
        city: salonForm.city.trim() || "Ikke sat",
        countryCode: salonForm.countryCode.trim().toUpperCase() || "DK",
        latitude: Number(salonForm.latitude || "0"),
        longitude: Number(salonForm.longitude || "0"),
      });
      setSelectedSalonId(id);
      Alert.alert("Salon oprettet", "Fortsæt til næste step.");
      return id;
    } catch (error) {
      Alert.alert("Kunne ikke oprette salon", String(error));
      return null;
    }
  }

  function applyLocation(args: {
    latitude: number;
    longitude: number;
    addressLine1: string;
    postalCode: string;
    city: string;
    countryCode: string;
  }) {
    setSalonForm((prev) => ({
      ...prev,
      latitude: args.latitude.toFixed(6),
      longitude: args.longitude.toFixed(6),
      addressLine1: args.addressLine1 || prev.addressLine1,
      postalCode: args.postalCode || prev.postalCode,
      city: args.city || prev.city,
      countryCode: args.countryCode || prev.countryCode,
    }));
  }

  async function onUseCurrentLocation() {
    try {
      setIsUsingCurrentLocation(true);
      setAddressSearchFeedback(null);
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
      setAddressSearchFeedback("Lokation fundet fra mobilen.");
    } catch (error) {
      Alert.alert("Kunne ikke hente lokation", String(error));
    } finally {
      setIsUsingCurrentLocation(false);
    }
  }

  async function onSearchAddress() {
    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressSearchFeedback("Skriv mindst 3 tegn for at søge.");
      return;
    }

    try {
      setIsSearchingAddress(true);
      setAddressSearchFeedback(null);

      const geocode = await Location.geocodeAsync(query);
      const first = geocode[0];
      if (!first) {
        setAddressSearchFeedback(
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
      setAddressSearchFeedback("Adresse fundet.");
    } catch (error) {
      Alert.alert("Søgning fejlede", String(error));
    } finally {
      setIsSearchingAddress(false);
    }
  }

  async function onSaveSalonOpeningHours() {
    if (!selectedSalonId) {
      return false;
    }

    try {
      await setSalonOpeningHours({
        salonId: selectedSalonId,
        entries: salonWeek.map((row) => ({
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
    if (!employeeForm.fullName.trim()) {
      Alert.alert("Manglende data", "Indtast navn på medarbejder.");
      return null;
    }

    try {
      const id = await createEmployee({
        fullName: employeeForm.fullName.trim(),
        email: employeeForm.email.trim() || undefined,
        phone: employeeForm.phone.trim() || undefined,
      });
      setSelectedEmployeeId(id);
      return id;
    } catch (error) {
      Alert.alert("Kunne ikke oprette ansat", String(error));
      return null;
    }
  }

  async function onAssignEmployee(employeeId: Id<"employees">) {
    if (!selectedSalonId) {
      return false;
    }

    try {
      await assignEmployee({
        employeeId,
        salonId: selectedSalonId,
        role: selectedAssignRole,
      });
      return true;
    } catch (error) {
      Alert.alert("Kunne ikke tilknytte ansat", String(error));
      return false;
    }
  }

  async function onSaveEmployeeHours() {
    if (!selectedEmployeeId || !selectedSalonId) {
      return false;
    }

    try {
      await setWorkingHours({
        employeeId: selectedEmployeeId,
        salonId: selectedSalonId,
        entries: employeeWeek.map((row) => ({
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
    if (!selectedSalonId) {
      return null;
    }
    if (!categoryForm.name.trim()) {
      return selectedCategoryId;
    }

    try {
      const id = await createCategory({
        salonId: selectedSalonId,
        name: categoryForm.name.trim(),
        displayOrder: categoryForm.displayOrder
          ? Number(categoryForm.displayOrder)
          : undefined,
      });
      setSelectedCategoryId(id);
      setCategoryForm({ name: "", displayOrder: "" });
      return id;
    } catch (error) {
      Alert.alert("Kunne ikke oprette kategori", String(error));
      return null;
    }
  }

  async function onCreateService(categoryId: Id<"serviceCategories">) {
    if (!selectedSalonId || !serviceForm.name.trim()) {
      Alert.alert("Manglende data", "Vælg kategori og service-navn.");
      return false;
    }

    try {
      await createService({
        salonId: selectedSalonId,
        categoryId,
        name: serviceForm.name.trim(),
        durationMinutes: Number(serviceForm.durationMinutes),
        priceDkk: Number(serviceForm.priceDkk),
      });
      return true;
    } catch (error) {
      Alert.alert("Kunne ikke oprette service", String(error));
      return false;
    }
  }

  async function nextStep() {
    if (stepIndex === 0) {
      if (selectedSalonId && !salonForm.name.trim() && !salonForm.slug.trim()) {
        setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
        return;
      }

      const createdSalonId = await onCreateSalon();
      if (!createdSalonId) {
        return;
      }
      setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }

    if (stepIndex === 1) {
      const didSave = await onSaveSalonOpeningHours();
      if (!didSave) {
        return;
      }
      setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }

    if (stepIndex === 2) {
      let employeeId = selectedEmployeeId;
      if (!employeeId) {
        employeeId = await onCreateEmployee();
      }
      if (!employeeId) {
        return;
      }
      const didAssign = await onAssignEmployee(employeeId);
      if (!didAssign) {
        return;
      }
      setSelectedEmployeeId(employeeId);
      setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }

    if (stepIndex === 3) {
      const didSave = await onSaveEmployeeHours();
      if (!didSave) {
        return;
      }
      setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }

    if (stepIndex === 4) {
      const categoryId = await onCreateCategory();
      if (!categoryId) {
        Alert.alert(
          "Manglende data",
          "Udfyld kategori eller vælg en eksisterende.",
        );
        return;
      }
      const didCreateService = await onCreateService(categoryId);
      if (!didCreateService) {
        return;
      }
      Alert.alert("Onboarding færdig", "Salon setup er klar.");
      return;
    }

    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function previousStep() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  const progressPercent = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-16"
    >
      <View
        className="gap-2 rounded-2xl bg-neutral-900 p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-sm font-semibold text-neutral-100">
          Admin onboarding
        </Text>
        <Text selectable className="text-xs text-neutral-300">
          Step {stepIndex + 1} af {STEPS.length}: {STEPS[stepIndex]}
        </Text>
        <View
          className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-700"
          style={{ borderCurve: "continuous" }}
        >
          <View
            className="h-full rounded-full bg-white"
            style={{ width: `${progressPercent}%`, borderCurve: "continuous" }}
          />
        </View>
      </View>

      {stepIndex === 0 ? (
        <Section
          title="1. Vælg eller opret salon"
          subtitle="Start med at vælge en salon, eller opret en ny."
        >
          <SelectPills
            options={salons.map((salon) => ({
              label: salon.name,
              value: salon._id,
            }))}
            selected={selectedSalonId}
            onSelect={setSelectedSalonId}
          />
          <Field
            label="Navn"
            placeholder="Cut&Go"
            value={salonForm.name}
            onChangeText={(value) => {
              setSalonForm((prev) => ({
                ...prev,
                name: value,
                slug: isSlugManuallyEdited
                  ? prev.slug
                  : createSlugFromName(value),
              }));
            }}
          />
          <Field
            label="Slug"
            value={salonForm.slug}
            onChangeText={(value) => {
              setIsSlugManuallyEdited(true);
              setSalonForm((prev) => ({ ...prev, slug: value }));
            }}
            placeholder="cutgo-kbh-c"
          />
          <Field
            label="Søg adresse"
            value={addressQuery}
            onChangeText={setAddressQuery}
            placeholder="Fx Vesterbrogade 17, København"
            onSubmitEditing={onSearchAddress}
            returnKeyType="search"
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <ActionButton
                title={isSearchingAddress ? "Søger adresse..." : "Find adresse"}
                onPress={onSearchAddress}
                disabled={isSearchingAddress || addressQuery.trim().length < 3}
                variant="light"
              />
            </View>
            <View className="flex-1">
              <ActionButton
                title={
                  isUsingCurrentLocation
                    ? "Henter lokation..."
                    : "Brug min lokation"
                }
                onPress={onUseCurrentLocation}
                disabled={isUsingCurrentLocation}
                variant="light"
              />
            </View>
          </View>
          {isSearchingAddress ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#171717" />
              <Text selectable className="text-xs text-neutral-600">
                Finder de bedste adresser...
              </Text>
            </View>
          ) : null}
          {addressSearchFeedback ? (
            <Text selectable className="text-xs text-neutral-600">
              {addressSearchFeedback}
            </Text>
          ) : null}
          <View
            className="gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-xs font-semibold text-neutral-600">
              Valgt lokation
            </Text>
            <Text selectable className="text-sm text-neutral-800">
              {salonForm.addressLine1 || "Ingen adresse valgt endnu"}
            </Text>
            <Text selectable className="text-xs text-neutral-500">
              {salonForm.postalCode || "----"} {salonForm.city || ""}
            </Text>
            <Text selectable className="text-xs text-neutral-500">
              {salonForm.latitude && salonForm.longitude
                ? `${salonForm.latitude}, ${salonForm.longitude}`
                : "Lokation ikke valgt endnu"}
            </Text>
          </View>
        </Section>
      ) : null}

      {stepIndex === 1 ? (
        <Section
          title="2. Sæt åbningstider"
          subtitle="Sæt salonens åbningstider for hele ugen."
        >
          <DayEditor rows={salonWeek} onChange={setSalonWeek} />
          <Text selectable className="text-xs text-neutral-500">
            Åbningstider gemmes automatisk når du trykker Næste.
          </Text>
        </Section>
      ) : null}

      {stepIndex === 2 ? (
        <Section
          title="3. Opret og tilknyt medarbejder"
          subtitle="Opret én medarbejder og tilknyt til salonen."
        >
          <Field
            label="Fulde navn"
            value={employeeForm.fullName}
            onChangeText={(value) =>
              setEmployeeForm((prev) => ({ ...prev, fullName: value }))
            }
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Field
                label="Email"
                value={employeeForm.email}
                onChangeText={(value) =>
                  setEmployeeForm((prev) => ({ ...prev, email: value }))
                }
                keyboardType="email-address"
              />
            </View>
            <View className="flex-1">
              <Field
                label="Telefon"
                value={employeeForm.phone}
                onChangeText={(value) =>
                  setEmployeeForm((prev) => ({ ...prev, phone: value }))
                }
              />
            </View>
          </View>
          <SelectPills
            options={employees.map((employee) => ({
              label: employee.fullName,
              value: employee._id,
            }))}
            selected={selectedEmployeeId}
            onSelect={setSelectedEmployeeId}
          />
          <SelectPills
            options={[
              { label: "Owner", value: "owner" },
              { label: "Manager", value: "manager" },
              { label: "Stylist", value: "stylist" },
              { label: "Assistant", value: "assistant" },
            ]}
            selected={selectedAssignRole}
            onSelect={setSelectedAssignRole}
          />
          <Text selectable className="text-xs text-neutral-500">
            Tilknyttede ansatte i salon: {selectedSalonAssignedEmployees.length}
          </Text>
          <Text selectable className="text-xs text-neutral-500">
            Ansat oprettes/tilknyttes automatisk når du trykker Næste.
          </Text>
        </Section>
      ) : null}

      {stepIndex === 3 ? (
        <Section
          title="4. Sæt arbejdstider"
          subtitle="Sæt ugentlig arbejdstid for valgt medarbejder."
        >
          <DayEditor rows={employeeWeek} onChange={setEmployeeWeek} />
          <Text selectable className="text-xs text-neutral-500">
            Arbejdstider gemmes automatisk når du trykker Næste.
          </Text>
        </Section>
      ) : null}

      {stepIndex === 4 ? (
        <Section
          title="5. Opret kategori og service"
          subtitle="Tilføj mindst én kategori og én service."
        >
          <Field
            label="Kategori navn"
            value={categoryForm.name}
            onChangeText={(value) =>
              setCategoryForm((prev) => ({ ...prev, name: value }))
            }
          />
          <Field
            label="Sortering"
            value={categoryForm.displayOrder}
            onChangeText={(value) =>
              setCategoryForm((prev) => ({ ...prev, displayOrder: value }))
            }
            keyboardType="numeric"
          />

          <SelectPills
            options={categoriesWithServices.map((category) => ({
              label: category.name,
              value: category._id,
            }))}
            selected={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
          <Field
            label="Service navn"
            value={serviceForm.name}
            onChangeText={(value) =>
              setServiceForm((prev) => ({ ...prev, name: value }))
            }
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Field
                label="Varighed (min)"
                value={serviceForm.durationMinutes}
                onChangeText={(value) =>
                  setServiceForm((prev) => ({
                    ...prev,
                    durationMinutes: value,
                  }))
                }
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Field
                label="Pris (DKK)"
                value={serviceForm.priceDkk}
                onChangeText={(value) =>
                  setServiceForm((prev) => ({ ...prev, priceDkk: value }))
                }
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text selectable className="text-xs text-neutral-500">
            Kategori og service oprettes automatisk når du trykker Færdig.
          </Text>
        </Section>
      ) : null}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <ActionButton
            title="Tilbage"
            onPress={previousStep}
            disabled={stepIndex === 0}
            variant="light"
          />
        </View>
        <View className="flex-1">
          <ActionButton
            title={stepIndex === STEPS.length - 1 ? "Færdig" : "Næste"}
            onPress={nextStep}
            disabled={!canContinue}
          />
        </View>
      </View>
    </ScrollView>
  );
}
