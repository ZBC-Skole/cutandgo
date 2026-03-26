import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import { BookingOptionChip } from "@/features/booking/components/booking-option-chip";
import { ServiceCategoryPanel } from "@/features/booking/components/service-category-panel";
import {
  formatBookingDateTime,
  formatDatePill,
  fromDateKey,
  getTimeFromDate,
  toDateKey,
} from "@/features/booking/lib/date-time";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

type SelectedSalonId = Id<"salons"> | null;
type SelectedStylistId = Id<"employees"> | null;

export function BookingScreen() {
  const salonsQuery = useQuery(api.salons.listActive);
  const profile = useQuery(api.userProfiles.getMyProfile);
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

  const createBooking = useMutation(api.bookings.createBooking);
  const setPreferredSalon = useMutation(api.userProfiles.setMyPreferredSalon);

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
    api.services.listBySalon,
    selectedSalonId ? { salonId: selectedSalonId, activeOnly: true } : "skip",
  );
  const stylistsQuery = useQuery(
    api.staff.listPublicSalonEmployees,
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

  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + index);
      return { key: toDateKey(date), label: formatDatePill(date) };
    });
  }, []);

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
    api.bookings.listAvailableSlotsForSalon,
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

  const predefinedStartTimesForSelectedDate = useMemo(() => {
    const now = Date.now();
    return (slots ?? []).filter((slot) => slot.startAt > now);
  }, [slots]);

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

  const isBookingReady = bookingValidation.isValid;

  function handleSelectService(service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceDkk: number;
  }) {
    setSelectedServiceId(service.id as Id<"services">);
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

  if (!salonsQuery || profile === undefined) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-10"
    >
      <View
        className="gap-2 rounded-2xl bg-white p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          1. Vælg salon
        </Text>
        {salons.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3 py-1">
              {salons.map((salon) => (
                <BookingOptionChip
                  key={salon._id}
                  title={salon.name}
                  subtitle={`${salon.city} • ${salon.addressLine1}`}
                  selected={salon._id === selectedSalonId}
                  className="w-60"
                  onPress={() => handleSelectSalon(salon._id)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text selectable className="text-sm text-neutral-500">
            Ingen saloner er oprettet endnu.
          </Text>
        )}
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          2. Vælg behandling
        </Text>
        <View className="gap-2">
          {categories.length > 0 ? (
            categories.map((category) => (
              <ServiceCategoryPanel
                key={category.id}
                category={category}
                isOpen={openCategoryId === category.id}
                selectedServiceId={selectedService?.id ?? null}
                onToggle={() =>
                  setOpenCategoryId((current) =>
                    current === category.id ? "" : category.id,
                  )
                }
                onSelectService={handleSelectService}
              />
            ))
          ) : (
            <Text selectable className="text-sm text-neutral-500">
              Ingen behandlinger er aktive i den valgte salon endnu.
            </Text>
          )}
        </View>
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          3. Vælg medarbejder
        </Text>
        {stylists.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3 py-1">
              {stylists.map((stylist) => (
                <BookingOptionChip
                  key={stylist.id}
                  title={stylist.name}
                  subtitle={stylist.role}
                  selected={stylist.id === selectedStylistId}
                  className="w-55"
                  onPress={() => handleSelectStylist(stylist.id)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text selectable className="text-sm text-neutral-500">
            Ingen medarbejdere fundet til den valgte salon.
          </Text>
        )}
      </View>

      <View
        className="gap-3 rounded-2xl bg-white p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          4. Vælg dato og tidspunkt
        </Text>

        {selectedService && selectedStylist ? (
          <>
            <Text
              selectable
              className="text-xs uppercase tracking-wide text-neutral-500"
            >
              Dato
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {dateOptions.map((dateOption) => (
                  <BookingOptionChip
                    key={dateOption.key}
                    title={dateOption.label}
                    selected={dateOption.key === selectedDateKey}
                    className="min-w-27"
                    onPress={() => handleSelectDate(dateOption.key)}
                  />
                ))}
              </View>
            </ScrollView>

            <Text
              selectable
              className="text-xs uppercase tracking-wide text-neutral-500"
            >
              Tilgængelige tider
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleAutoSelectNextAvailable}
              className="rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2"
              style={{ borderCurve: "continuous" }}
            >
              <Text
                selectable
                className="text-sm font-semibold text-neutral-900"
              >
                Auto-vælg næste ledige
              </Text>
            </Pressable>

            <View className="overflow-hidden">
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsTimesOpen((current) => !current)}
                className="flex-row items-center justify-between px-3 py-3"
              >
                <Text
                  selectable
                  className="text-sm font-semibold text-neutral-900"
                >
                  {predefinedStartTimesForSelectedDate.length} ledige tider
                </Text>
                <Text selectable className="text-base text-neutral-500">
                  {isTimesOpen ? "−" : "+"}
                </Text>
              </Pressable>

              {isTimesOpen ? (
                <View className="gap-2 border-t border-neutral-100 p-3">
                  {predefinedStartTimesForSelectedDate.length > 0 ? (
                    predefinedStartTimesForSelectedDate.map((slot) => {
                      const time = getTimeFromDate(new Date(slot.startAt));
                      const endTime = getTimeFromDate(new Date(slot.endAt));
                      const isSelected = selectedSlotStartAt === slot.startAt;

                      return (
                        <Pressable
                          key={slot.startAt}
                          accessibilityRole="button"
                          onPress={() => handleSelectTime(slot.startAt)}
                          className={`rounded-xl border px-3 py-3 ${
                            isSelected
                              ? "border-neutral-900 bg-neutral-900"
                              : "border-neutral-200 bg-white"
                          }`}
                          style={{ borderCurve: "continuous" }}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text
                              selectable
                              className={`text-sm font-semibold ${
                                isSelected ? "text-white" : "text-neutral-900"
                              }`}
                            >
                              {time} - {endTime}
                            </Text>
                            <Text
                              selectable
                              className={`text-xs ${
                                isSelected
                                  ? "text-neutral-200"
                                  : "text-neutral-500"
                              }`}
                            >
                              {selectedService.durationMinutes} min
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text selectable className="text-sm text-neutral-500">
                      Ingen ledige tider på den valgte dato for denne
                      kombination.
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <View className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <Text selectable className="text-sm text-blue-800">
              Vælg behandling og medarbejder først. Derefter hentes ledige tider
              direkte fra systemet.
            </Text>
          </View>
        )}
      </View>

      <View
        className="gap-3 rounded-2xl bg-white p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          5. Overblik
        </Text>

        <View className="gap-1">
          <Text selectable className="text-sm text-neutral-600">
            Salon:{" "}
            <Text className="font-semibold text-neutral-900">
              {selectedSalon?.name ?? "Ikke valgt"}
            </Text>
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            Behandling:{" "}
            <Text className="font-semibold text-neutral-900">
              {selectedService
                ? `${selectedService.name} (${selectedService.durationMinutes} min)`
                : "Ikke valgt"}
            </Text>
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            Medarbejder:{" "}
            <Text className="font-semibold text-neutral-900">
              {selectedStylist?.name ?? "Ikke valgt"}
            </Text>
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            Dato/tid:{" "}
            <Text className="font-semibold text-neutral-900">
              {selectedSlot
                ? `${formatBookingDateTime(
                    new Date(selectedSlot.startAt),
                  )}${bookingValidation.endTime ? `-${bookingValidation.endTime}` : ""}`
                : "Ikke valgt"}
            </Text>
          </Text>
        </View>

        <View className="gap-1">
          <Text selectable className="text-xs text-neutral-500">
            Note til salonen
          </Text>
          <TextInput
            value={customerNote}
            onChangeText={setCustomerNote}
            placeholder="Tilføj evt. en kort note"
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-neutral-900"
            style={{ borderCurve: "continuous" }}
          />
        </View>

        {bookingValidation.reason && selectedSlot ? (
          <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Text selectable className="text-sm text-amber-800">
              {bookingValidation.reason}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!isBookingReady || isSubmitting}
          onPress={() => {
            void handleConfirmBooking();
          }}
          className={`rounded-xl px-4 py-3 ${
            isBookingReady && !isSubmitting
              ? "bg-neutral-900"
              : "bg-neutral-300"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className="text-center text-base font-semibold text-white"
          >
            {isSubmitting ? "Booker..." : "Book tid"}
          </Text>
        </Pressable>

        {confirmationText ? (
          <View className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <Text selectable className="text-sm text-emerald-800">
              {confirmationText}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
