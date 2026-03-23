import { BookingOptionChip } from "@/features/booking/components/booking-option-chip";
import { ServiceCategoryPanel } from "@/features/booking/components/service-category-panel";
import {
  salons,
  serviceCategories,
  stylists,
} from "@/features/booking/data/demo-booking-data";
import {
  formatBookingDateTime,
  formatDatePill,
  fromDateKey,
  getTimeFromDate,
  mergeDateAndTime,
  toDateKey,
} from "@/features/booking/lib/date-time";
import {
  confirmationTextAtom,
  isTimesOpenAtom,
  openCategoryIdAtom,
  selectedDateKeyAtom,
  selectedDateTimeAtom,
  selectedSalonIdAtom,
  selectedServiceAtom,
  selectedStylistIdAtom,
} from "@/features/booking/state/booking-atoms";
import {
  getEndTime,
  parseTimeToMinutes,
} from "@/features/booking/utils/time-slots";
import { useAtom } from "jotai";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export function BookingScreen() {
  const [selectedSalonId, setSelectedSalonId] = useAtom(selectedSalonIdAtom);
  const [selectedService, setSelectedService] = useAtom(selectedServiceAtom);
  const [selectedStylistId, setSelectedStylistId] = useAtom(
    selectedStylistIdAtom,
  );
  const [selectedDateKey, setSelectedDateKey] = useAtom(selectedDateKeyAtom);
  const [selectedDateTime, setSelectedDateTime] = useAtom(selectedDateTimeAtom);
  const [openCategoryId, setOpenCategoryId] = useAtom(openCategoryIdAtom);
  const [isTimesOpen, setIsTimesOpen] = useAtom(isTimesOpenAtom);
  const [confirmationText, setConfirmationText] = useAtom(confirmationTextAtom);

  const selectedSalon = useMemo(
    () => salons.find((salon) => salon.id === selectedSalonId) ?? null,
    [selectedSalonId],
  );

  const availableStylists = useMemo(
    () =>
      stylists.filter((stylist) => stylist.salonIds.includes(selectedSalonId)),
    [selectedSalonId],
  );

  const selectedStylist = useMemo(
    () =>
      availableStylists.find((stylist) => stylist.id === selectedStylistId) ??
      null,
    [availableStylists, selectedStylistId],
  );

  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + index);
      return { key: toDateKey(date), label: formatDatePill(date) };
    });
  }, []);

  const predefinedStartTimes = useMemo(() => {
    if (!selectedService || !selectedStylist) {
      return [];
    }

    const openMinutes = parseTimeToMinutes(selectedStylist.workingHours.start);
    const closeMinutes = parseTimeToMinutes(selectedStylist.workingHours.end);

    const slots: string[] = [];

    for (
      let startMinutes = openMinutes;
      startMinutes + selectedService.durationMinutes <= closeMinutes;
      startMinutes += 15
    ) {
      const endMinutes = startMinutes + selectedService.durationMinutes;

      const overlapsBlocked = selectedStylist.blocked.some((interval) => {
        const blockedStart = parseTimeToMinutes(interval.start);
        const blockedEnd = parseTimeToMinutes(interval.end);
        return startMinutes < blockedEnd && endMinutes > blockedStart;
      });

      if (!overlapsBlocked) {
        const hours = String(Math.floor(startMinutes / 60)).padStart(2, "0");
        const minutes = String(startMinutes % 60).padStart(2, "0");
        slots.push(`${hours}:${minutes}`);
      }
    }

    return slots;
  }, [selectedService, selectedStylist]);

  const predefinedStartTimesForSelectedDate = useMemo(() => {
    if (!selectedService || !selectedStylist) {
      return [];
    }

    const selectedDate = fromDateKey(selectedDateKey);
    const now = new Date();

    return predefinedStartTimes.filter((time) => {
      const candidateDateTime = mergeDateAndTime(selectedDate, time);
      return candidateDateTime.getTime() > now.getTime();
    });
  }, [predefinedStartTimes, selectedDateKey, selectedService, selectedStylist]);

  const bookingValidation = useMemo(() => {
    if (!selectedService || !selectedStylist || !selectedDateTime) {
      return {
        isValid: false,
        reason: "Vælg service, stylist, dato og tidspunkt.",
        endTime: null as string | null,
      };
    }

    const now = new Date();
    if (selectedDateTime.getTime() < now.getTime()) {
      return {
        isValid: false,
        reason: "Du kan ikke vælge et tidspunkt i fortiden.",
        endTime: null,
      };
    }

    const selectedTime = getTimeFromDate(selectedDateTime);
    const startMinutes = parseTimeToMinutes(selectedTime);
    const endMinutes = startMinutes + selectedService.durationMinutes;
    const stylistStartMinutes = parseTimeToMinutes(
      selectedStylist.workingHours.start,
    );
    const stylistEndMinutes = parseTimeToMinutes(
      selectedStylist.workingHours.end,
    );

    if (startMinutes < stylistStartMinutes || endMinutes > stylistEndMinutes) {
      return {
        isValid: false,
        reason: `Tidspunktet ligger uden for ${selectedStylist.name}s arbejdstid (${selectedStylist.workingHours.start}-${selectedStylist.workingHours.end}).`,
        endTime: null,
      };
    }

    const overlapsBlocked = selectedStylist.blocked.some((interval) => {
      const blockedStart = parseTimeToMinutes(interval.start);
      const blockedEnd = parseTimeToMinutes(interval.end);
      return startMinutes < blockedEnd && endMinutes > blockedStart;
    });

    if (overlapsBlocked) {
      return {
        isValid: false,
        reason: "Tiden overlapper med en eksisterende booking/pause.",
        endTime: null,
      };
    }

    return {
      isValid: true,
      reason: null,
      endTime: getEndTime(selectedTime, selectedService.durationMinutes),
    };
  }, [selectedDateTime, selectedService, selectedStylist]);

  const isBookingReady =
    Boolean(selectedSalon) &&
    Boolean(selectedService) &&
    Boolean(selectedStylist) &&
    Boolean(selectedDateTime) &&
    bookingValidation.isValid;

  function handleSelectService(service: NonNullable<typeof selectedService>) {
    setSelectedService(service);
    setSelectedDateTime(null);
    setConfirmationText(null);
  }

  function handleSelectSalon(salonId: string) {
    setSelectedSalonId(salonId);

    const nextStylists = stylists.filter((stylist) =>
      stylist.salonIds.includes(salonId),
    );
    setSelectedStylistId(nextStylists[0]?.id ?? null);

    setSelectedDateTime(null);
    setConfirmationText(null);
  }

  function handleSelectStylist(stylistId: string) {
    setSelectedStylistId(stylistId);
    setSelectedDateTime(null);
    setConfirmationText(null);
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedDateTime(null);
    setIsTimesOpen(true);
    setConfirmationText(null);
  }

  function handleSelectTime(time: string) {
    const selectedDate = fromDateKey(selectedDateKey);
    const nextDateTime = mergeDateAndTime(selectedDate, time);
    setSelectedDateTime(nextDateTime);
    setConfirmationText(null);
  }

  function handleAutoSelectNextAvailable() {
    if (!selectedService || !selectedStylist) {
      return;
    }

    const now = new Date();

    for (const dateOption of dateOptions) {
      const date = fromDateKey(dateOption.key);
      const nextTime = predefinedStartTimes.find((time) => {
        const candidateDateTime = mergeDateAndTime(date, time);
        return candidateDateTime.getTime() > now.getTime();
      });

      if (nextTime) {
        setSelectedDateKey(dateOption.key);
        setSelectedDateTime(mergeDateAndTime(date, nextTime));
        setIsTimesOpen(true);
        setConfirmationText(null);
        return;
      }
    }
  }

  function handleConfirmBooking() {
    if (
      !selectedSalon ||
      !selectedService ||
      !selectedStylist ||
      !selectedDateTime ||
      !bookingValidation.isValid ||
      !bookingValidation.endTime
    ) {
      return;
    }

    setConfirmationText(
      `Booking oprettet hos ${selectedSalon.name} med ${selectedStylist.name} d. ${formatBookingDateTime(selectedDateTime)}-${bookingValidation.endTime}.`,
    );
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3 py-1">
            {salons.map((salon) => (
              <BookingOptionChip
                key={salon.id}
                title={salon.name}
                subtitle={`${salon.city} • ${salon.address}`}
                selected={salon.id === selectedSalonId}
                className="w-60"
                onPress={() => handleSelectSalon(salon.id)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          2. Vælg behandling
        </Text>
        <View className="gap-2">
          {serviceCategories.map((category) => (
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
          ))}
        </View>
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4 shadow-sm"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          3. Vælg stylist
        </Text>
        {availableStylists.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3 py-1">
              {availableStylists.map((stylist) => (
                <BookingOptionChip
                  key={stylist.id}
                  title={stylist.name}
                  subtitle={`${stylist.role} • ${stylist.workingHours.start}-${stylist.workingHours.end}`}
                  selected={stylist.id === selectedStylistId}
                  className="w-55"
                  onPress={() => handleSelectStylist(stylist.id)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text selectable className="text-sm text-neutral-500">
            Ingen stylister fundet til den valgte salon.
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
              Tilgængelige tider (auto ud fra valg)
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
                    predefinedStartTimesForSelectedDate.map((time) => {
                      const endTime = getEndTime(
                        time,
                        selectedService.durationMinutes,
                      );
                      const isSelected =
                        selectedDateTime &&
                        toDateKey(selectedDateTime) === selectedDateKey &&
                        getTimeFromDate(selectedDateTime) === time;

                      return (
                        <Pressable
                          key={`${selectedDateKey}-${time}`}
                          accessibilityRole="button"
                          onPress={() => handleSelectTime(time)}
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
              Vælg behandling og stylist først. Derefter får du konkrete tider
              med det samme.
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
            Stylist:{" "}
            <Text className="font-semibold text-neutral-900">
              {selectedStylist?.name ?? "Ikke valgt"}
            </Text>
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            Dato/tid:{" "}
            <Text className="font-semibold text-neutral-900">
              {selectedDateTime
                ? `${formatBookingDateTime(selectedDateTime)}${bookingValidation.endTime ? `-${bookingValidation.endTime}` : ""}`
                : "Ikke valgt"}
            </Text>
          </Text>
        </View>

        {bookingValidation.reason && selectedDateTime ? (
          <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Text selectable className="text-sm text-amber-800">
              {bookingValidation.reason}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!isBookingReady}
          onPress={handleConfirmBooking}
          className={`rounded-xl px-4 py-3 ${
            isBookingReady ? "bg-neutral-900" : "bg-neutral-300"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className="text-center text-base font-semibold text-white"
          >
            Book tid
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
