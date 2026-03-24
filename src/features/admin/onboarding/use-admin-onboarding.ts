import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ONBOARDING_STEPS } from "@/features/admin/onboarding/constants";
import {
  createDefaultWeek,
  createSlugFromName,
} from "@/features/admin/onboarding/lib";
import type {
  DayDraft,
  EmployeeAssignRole,
} from "@/features/admin/onboarding/types";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

export function useAdminOnboarding() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isFlowCompleted, setIsFlowCompleted] = useState(false);

  const salonsQuery = useQuery(api.salons.listActive);
  const employeesQuery = useQuery(api.staff.listEmployees);

  const [selectedSalonId, setSelectedSalonId] = useState<Id<"salons"> | null>(
    null,
  );
  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<Id<"employees"> | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<Id<"serviceCategories"> | null>(null);
  const [selectedAssignRole, setSelectedAssignRole] =
    useState<EmployeeAssignRole>("stylist");

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

  const stepValidationMessage = useMemo(() => {
    if (stepIndex === 0) {
      if (!selectedSalonId) {
        if (!salonForm.name.trim()) {
          return "Skriv et salonnavn for at fortsætte.";
        }
        if (!salonForm.slug.trim()) {
          return "Tilføj et slug (url-navn) for salonen.";
        }
        if (!salonForm.latitude || !salonForm.longitude) {
          return "Find adresse eller brug din lokation først.";
        }
      }
      return null;
    }

    if (stepIndex === 1 && !selectedSalonId) {
      return "Vælg eller opret en salon først.";
    }

    if (stepIndex === 2) {
      if (!selectedSalonId) {
        return "Vælg en salon først.";
      }
      if (!selectedEmployeeId && !employeeForm.fullName.trim()) {
        return "Vælg en medarbejder eller indtast navn for en ny.";
      }
      return null;
    }

    if (stepIndex === 3 && (!selectedEmployeeId || !selectedSalonId)) {
      return "Vælg både salon og medarbejder før arbejdstider.";
    }

    if (stepIndex === 4) {
      if (!selectedSalonId) {
        return "Vælg en salon først.";
      }
      if (!serviceForm.name.trim()) {
        return "Indtast et servicenavn for at afslutte setup.";
      }
      if (!selectedCategoryId && !categoryForm.name.trim()) {
        return "Vælg en kategori eller opret en ny.";
      }
      return null;
    }

    return null;
  }, [
    categoryForm.name,
    employeeForm.fullName,
    salonForm.latitude,
    salonForm.longitude,
    salonForm.name,
    salonForm.slug,
    selectedCategoryId,
    selectedEmployeeId,
    selectedSalonId,
    serviceForm.name,
    stepIndex,
  ]);

  const canContinue = !stepValidationMessage;

  function updateSalonName(value: string) {
    setSalonForm((previous) => ({
      ...previous,
      name: value,
      slug: isSlugManuallyEdited ? previous.slug : createSlugFromName(value),
    }));
  }

  function updateSalonSlug(value: string) {
    setIsSlugManuallyEdited(true);
    setSalonForm((previous) => ({ ...previous, slug: value }));
  }

  function applyLocation(args: {
    latitude: number;
    longitude: number;
    addressLine1: string;
    postalCode: string;
    city: string;
    countryCode: string;
  }) {
    setSalonForm((previous) => ({
      ...previous,
      latitude: args.latitude.toFixed(6),
      longitude: args.longitude.toFixed(6),
      addressLine1: args.addressLine1 || previous.addressLine1,
      postalCode: args.postalCode || previous.postalCode,
      city: args.city || previous.city,
      countryCode: args.countryCode || previous.countryCode,
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

  async function onCreateSalon() {
    if (!salonForm.name.trim() || !salonForm.slug.trim()) {
      Alert.alert("Manglende data", "Udfyld mindst navn og slug.");
      return null;
    }
    if (!salonForm.latitude || !salonForm.longitude) {
      Alert.alert(
        "Manglende lokation",
        "Brug 'Find adresse' eller 'Brug min lokation' først.",
      );
      return null;
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
      return id;
    } catch (error) {
      Alert.alert("Kunne ikke oprette salon", String(error));
      return null;
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
    if (!canContinue || isSavingStep) {
      return;
    }

    try {
      setIsSavingStep(true);

      if (stepIndex === 0) {
        if (
          selectedSalonId &&
          !salonForm.name.trim() &&
          !salonForm.slug.trim()
        ) {
          setStepIndex((current) =>
            Math.min(current + 1, ONBOARDING_STEPS.length - 1),
          );
          return;
        }

        const createdSalonId = await onCreateSalon();
        if (!createdSalonId) {
          return;
        }
        setStepIndex((current) =>
          Math.min(current + 1, ONBOARDING_STEPS.length - 1),
        );
        return;
      }

      if (stepIndex === 1) {
        const didSave = await onSaveSalonOpeningHours();
        if (!didSave) {
          return;
        }
        setStepIndex((current) =>
          Math.min(current + 1, ONBOARDING_STEPS.length - 1),
        );
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
        setStepIndex((current) =>
          Math.min(current + 1, ONBOARDING_STEPS.length - 1),
        );
        return;
      }

      if (stepIndex === 3) {
        const didSave = await onSaveEmployeeHours();
        if (!didSave) {
          return;
        }
        setStepIndex((current) =>
          Math.min(current + 1, ONBOARDING_STEPS.length - 1),
        );
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
        setIsFlowCompleted(true);
      }
    } finally {
      setIsSavingStep(false);
    }
  }

  function previousStep() {
    if (isSavingStep) {
      return;
    }
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  const progressPercent = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return {
    stepIndex,
    isSavingStep,
    isFlowCompleted,
    progressPercent,
    stepValidationMessage,
    canContinue,

    salons,
    employees,
    categoriesWithServices,
    selectedSalonAssignedEmployees,

    selectedSalonId,
    setSelectedSalonId,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedAssignRole,
    setSelectedAssignRole,

    salonWeek,
    setSalonWeek,
    employeeWeek,
    setEmployeeWeek,

    salonForm,
    updateSalonName,
    updateSalonSlug,

    addressQuery,
    setAddressQuery,
    isUsingCurrentLocation,
    isSearchingAddress,
    addressSearchFeedback,
    onUseCurrentLocation,
    onSearchAddress,

    employeeForm,
    setEmployeeForm,

    categoryForm,
    setCategoryForm,

    serviceForm,
    setServiceForm,

    previousStep,
    nextStep,
  };
}
