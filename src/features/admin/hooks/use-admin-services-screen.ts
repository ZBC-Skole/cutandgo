import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

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

export function formatMoney(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function useAdminServicesScreen() {
  const salons = useQuery(api.backend.domains.salons.index.listActive);
  const createCategory = useMutation(
    api.backend.domains.services.index.createCategory,
  );
  const createService = useMutation(
    api.backend.domains.services.index.createService,
  );
  const archiveCategory = useMutation(
    api.backend.domains.services.index.archiveCategory,
  );
  const archiveService = useMutation(
    api.backend.domains.services.index.archiveService,
  );

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
    api.backend.domains.services.index.listBySalon,
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

  return {
    salons,
    categories,
    selectedSalonId,
    setSelectedSalonId,
    selectedCategoryId,
    setSelectedCategoryId,
    newCategoryName,
    setNewCategoryName,
    serviceForm,
    setServiceForm,
    isCreatingCategory,
    isCreatingService,
    isArchivingCategory,
    archivingServiceId,
    metrics,
    handleCreateCategory,
    handleCreateService,
    confirmArchiveCategory,
    confirmArchiveService,
  };
}

export type AdminServicesScreenState = ReturnType<
  typeof useAdminServicesScreen
>;
