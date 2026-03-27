import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ONBOARDING_STEPS } from "@/features/admin/onboarding/constants";
import { createDefaultWeek } from "@/features/admin/onboarding/lib";
import type {
  DayDraft,
  EmployeeAssignRole,
} from "@/features/admin/onboarding/types";
import { createAdminOnboardingActions } from "@/features/admin/onboarding/use-admin-onboarding-actions";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

export function useAdminOnboarding() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isFlowCompleted, setIsFlowCompleted] = useState(false);

  const salonsQuery = useQuery(api.backend.domains.salons.index.listActive);
  const employeesQuery = useQuery(
    api.backend.domains.staff.index.listEmployees,
  );

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
    api.backend.domains.salons.index.getOpeningHours,
    selectedSalonId ? { salonId: selectedSalonId } : "skip",
  );
  const workingHoursQuery = useQuery(
    api.backend.domains.staff.index.getWorkingHours,
    selectedSalonId && selectedEmployeeId
      ? { salonId: selectedSalonId, employeeId: selectedEmployeeId }
      : "skip",
  );
  const categoriesWithServicesQuery = useQuery(
    api.backend.domains.services.index.listBySalon,
    selectedSalonId ? { salonId: selectedSalonId, activeOnly: true } : "skip",
  );
  const salonEmployeesQuery = useQuery(
    api.backend.domains.staff.index.listSalonEmployees,
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

  const createSalon = useMutation(api.backend.domains.salons.index.create);
  const setSalonOpeningHours = useMutation(
    api.backend.domains.salons.index.setOpeningHours,
  );
  const createEmployee = useMutation(
    api.backend.domains.staff.index.createEmployee,
  );
  const assignEmployee = useMutation(
    api.backend.domains.staff.index.assignEmployeeToSalon,
  );
  const setWorkingHours = useMutation(
    api.backend.domains.staff.index.setWorkingHours,
  );
  const createCategory = useMutation(
    api.backend.domains.services.index.createCategory,
  );
  const createService = useMutation(
    api.backend.domains.services.index.createService,
  );

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

  const actions = createAdminOnboardingActions({
    addressQuery,
    setAddressSearchFeedback,
    setIsUsingCurrentLocation,
    setIsSearchingAddress,
    salonForm,
    setSalonForm,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    selectedSalonId,
    setSelectedSalonId,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedAssignRole,
    selectedCategoryId,
    setSelectedCategoryId,
    salonWeek,
    employeeWeek,
    employeeForm,
    categoryForm,
    setCategoryForm,
    serviceForm,
    createSalon,
    setSalonOpeningHours,
    createEmployee,
    assignEmployee,
    setWorkingHours,
    createCategory,
    createService,
  });

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

        const createdSalonId = await actions.onCreateSalon();
        if (!createdSalonId) {
          return;
        }
        setStepIndex((current) =>
          Math.min(current + 1, ONBOARDING_STEPS.length - 1),
        );
        return;
      }

      if (stepIndex === 1) {
        const didSave = await actions.onSaveSalonOpeningHours();
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
          employeeId = await actions.onCreateEmployee();
        }
        if (!employeeId) {
          return;
        }
        const didAssign = await actions.onAssignEmployee(employeeId);
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
        const didSave = await actions.onSaveEmployeeHours();
        if (!didSave) {
          return;
        }
        setStepIndex((current) =>
          Math.min(current + 1, ONBOARDING_STEPS.length - 1),
        );
        return;
      }

      if (stepIndex === 4) {
        const categoryId = await actions.onCreateCategory();
        if (!categoryId) {
          Alert.alert(
            "Manglende data",
            "Udfyld kategori eller vælg en eksisterende.",
          );
          return;
        }
        const didCreateService = await actions.onCreateService(categoryId);
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
    updateSalonName: actions.updateSalonName,
    updateSalonSlug: actions.updateSalonSlug,
    addressQuery,
    setAddressQuery,
    isUsingCurrentLocation,
    isSearchingAddress,
    addressSearchFeedback,
    onUseCurrentLocation: actions.onUseCurrentLocation,
    onSearchAddress: actions.onSearchAddress,
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
