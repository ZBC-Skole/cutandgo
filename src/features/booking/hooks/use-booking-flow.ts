import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  formatBookingDateTime,
  formatDatePill,
  fromDateKey,
  getTimeFromDate,
  toDateKey,
} from "@/features/booking/lib/date-time";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

type SelectedSalonId = Id<"salons"> | null;
type SelectedStylistId = Id<"employees"> | null;

export function useBookingFlow() {
  const salonsQuery = useQuery(api.backend.domains.salons.index.listActive);
  const profile = useQuery(api.backend.domains.users.profiles.getMyProfile);
  const [selectedSalonId, setSelectedSalonId] = useState<SelectedSalonId>(null);
  const [selectedServiceId, setSelectedServiceId] =
    useState<Id<"services"> | null>(null);
  const [selectedStylistId, setSelectedStylistId] =
    useState<SelectedStylistId>(null);
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState<number | null>(
    null,
  );
  const [openCategoryId, setOpenCategoryId] = useState("");
  const [isTimesOpen, setIsTimesOpen] = useState(true);
  const [confirmationText, setConfirmationText] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBooking = useMutation(
    api.backend.domains.bookings.index.createBooking,
  );
  const setPreferredSalon = useMutation(
    api.backend.domains.users.profiles.setMyPreferredSalon,
  );

  const salons = useMemo(() => salonsQuery ?? [], [salonsQuery]);

  useEffect(() => {
    if (salons.length === 0) {
      setSelectedSalonId(null);
      return;
    }

    setSelectedSalonId((current) => {
      if (current && salons.some((salon) => salon._id === current)) {
        return current;
      }

      const preferredSalonId = profile?.preferredSalonId;
      if (
        preferredSalonId &&
        salons.some((salon) => salon._id === preferredSalonId)
      ) {
        return preferredSalonId;
      }

      return salons[0]._id;
    });
  }, [profile?.preferredSalonId, salons]);

  const categoriesQuery = useQuery(
    api.backend.domains.services.index.listPublicBySalon,
    selectedSalonId ? { salonId: selectedSalonId } : "skip",
  );
  const stylistsQuery = useQuery(
    api.backend.domains.staff.index.listPublicSalonEmployees,
    selectedSalonId ? { salonId: selectedSalonId } : "skip",
  );

  const categories = useMemo(
    () =>
      (categoriesQuery ?? []).map((category) => ({
        id: category._id,
        name: category.name,
        services: category.services.map((service) => ({
          id: service._id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceDkk: service.priceDkk,
        })),
      })),
    [categoriesQuery],
  );

  const stylists = useMemo(
    () =>
      (stylistsQuery ?? []).map((stylist) => ({
        id: stylist._id,
        name: stylist.fullName,
        role: stylist.title,
      })),
    [stylistsQuery],
  );

  useEffect(() => {
    if (categories.length === 0) {
      setOpenCategoryId("");
      setSelectedServiceId(null);
      return;
    }

    setOpenCategoryId((current) =>
      current && categories.some((category) => category.id === current)
        ? current
        : categories[0].id,
    );
    setSelectedServiceId((current) =>
      current &&
      categories.some((category) =>
        category.services.some((service) => service.id === current),
      )
        ? current
        : null,
    );
  }, [categories]);

  useEffect(() => {
    if (stylists.length === 0) {
      setSelectedStylistId(null);
      return;
    }

    setSelectedStylistId((current) =>
      current && stylists.some((stylist) => stylist.id === current)
        ? current
        : stylists[0].id,
    );
  }, [stylists]);

  const selectedSalon = useMemo(
    () => salons.find((salon) => salon._id === selectedSalonId) ?? null,
    [salons, selectedSalonId],
  );

  const selectedService = useMemo(() => {
    for (const category of categories) {
      const found = category.services.find(
        (service) => service.id === selectedServiceId,
      );
      if (found) {
        return found;
      }
    }

    return null;
  }, [categories, selectedServiceId]);

  const selectedStylist = useMemo(
    () => stylists.find((stylist) => stylist.id === selectedStylistId) ?? null,
    [selectedStylistId, stylists],
  );

  const dateOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + index);
        return { key: toDateKey(date), label: formatDatePill(date) };
      }),
    [],
  );

  const selectedDate = useMemo(
    () => fromDateKey(selectedDateKey),
    [selectedDateKey],
  );
  const selectedDayStartTs = useMemo(() => {
    const day = new Date(selectedDate);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  }, [selectedDate]);

  const slots = useQuery(
    api.backend.domains.bookings.index.listAvailableSlotsForSalon,
    selectedSalonId && selectedService && selectedStylistId
      ? {
          salonId: selectedSalonId,
          serviceId: selectedService.id,
          employeeId: selectedStylistId,
          dayStartTs: selectedDayStartTs,
          dayEndTs: selectedDayStartTs + 24 * 60 * 60 * 1000,
        }
      : "skip",
  );

  const predefinedStartTimesForSelectedDate = useMemo(
    () => (slots ?? []).filter((slot) => slot.startAt > Date.now()),
    [slots],
  );

  const selectedSlot = useMemo(
    () =>
      predefinedStartTimesForSelectedDate.find(
        (slot) => slot.startAt === selectedSlotStartAt,
      ) ?? null,
    [predefinedStartTimesForSelectedDate, selectedSlotStartAt],
  );

  const bookingValidation = useMemo(() => {
    if (
      !selectedSalon ||
      !selectedService ||
      !selectedStylist ||
      !selectedSlot
    ) {
      return {
        isValid: false,
        reason: "Vælg salon, behandling, medarbejder, dato og tidspunkt.",
        endTime: null as string | null,
      };
    }

    return {
      isValid: true,
      reason: null,
      endTime: getTimeFromDate(new Date(selectedSlot.endAt)),
    };
  }, [selectedSalon, selectedService, selectedSlot, selectedStylist]);

  function handleSelectService(serviceId: Id<"services">) {
    setSelectedServiceId(serviceId);
    setSelectedSlotStartAt(null);
    setConfirmationText(null);
  }

  function handleSelectSalon(salonId: Id<"salons">) {
    setSelectedSalonId(salonId);
    setSelectedServiceId(null);
    setSelectedStylistId(null);
    setSelectedSlotStartAt(null);
    setConfirmationText(null);
  }

  function handleSelectStylist(stylistId: Id<"employees">) {
    setSelectedStylistId(stylistId);
    setSelectedSlotStartAt(null);
    setConfirmationText(null);
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedSlotStartAt(null);
    setIsTimesOpen(true);
    setConfirmationText(null);
  }

  function handleSelectTime(startAt: number) {
    setSelectedSlotStartAt(startAt);
    setConfirmationText(null);
  }

  function handleAutoSelectNextAvailable() {
    const nextSlot = predefinedStartTimesForSelectedDate[0];
    if (!nextSlot) {
      return;
    }

    setSelectedSlotStartAt(nextSlot.startAt);
    setIsTimesOpen(true);
    setConfirmationText(null);
  }

  async function handleConfirmBooking() {
    if (
      !selectedSalonId ||
      !selectedService ||
      !selectedStylistId ||
      !selectedSlot ||
      !bookingValidation.endTime
    ) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createBooking({
        salonId: selectedSalonId,
        employeeId: selectedStylistId,
        serviceId: selectedService.id,
        startAt: selectedSlot.startAt,
        customerNote: customerNote.trim() || undefined,
      });
      await setPreferredSalon({ preferredSalonId: selectedSalonId });

      setConfirmationText(
        `Booking oprettet hos ${selectedSalon?.name} med ${selectedStylist?.name} d. ${formatBookingDateTime(
          new Date(selectedSlot.startAt),
        )}-${bookingValidation.endTime}.`,
      );
      setCustomerNote("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isLoading: !salonsQuery || profile === undefined,
    salons,
    selectedSalonId,
    categories,
    openCategoryId,
    setOpenCategoryId,
    selectedService,
    stylists,
    selectedStylistId,
    dateOptions,
    selectedDateKey,
    isTimesOpen,
    setIsTimesOpen,
    predefinedStartTimesForSelectedDate,
    selectedSlotStartAt,
    bookingValidation,
    isBookingReady: bookingValidation.isValid,
    customerNote,
    setCustomerNote,
    isSubmitting,
    confirmationText,
    handleSelectSalon,
    handleSelectService,
    handleSelectStylist,
    handleSelectDate,
    handleSelectTime,
    handleAutoSelectNextAvailable,
    handleConfirmBooking,
  };
}
