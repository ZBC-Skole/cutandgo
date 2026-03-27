import { BookingOptionChip } from "@/features/booking/components/booking-option-chip";
import { ServiceCategoryPanel } from "@/features/booking/components/service-category-panel";
import {
  formatBookingDateTime,
  getTimeFromDate,
} from "@/features/booking/lib/date-time";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

type SectionProps = {
  children: React.ReactNode;
};

export function BookingSection({ children }: SectionProps) {
  return (
    <View
      className="gap-2 rounded-2xl bg-white p-4 shadow-sm"
      style={{ borderCurve: "continuous" }}
    >
      {children}
    </View>
  );
}

export function TimeSlotList(props: {
  isTimesOpen: boolean;
  onToggleOpen: () => void;
  onAutoSelect: () => void;
  slots: { startAt: number; endAt: number }[];
  selectedSlotStartAt: number | null;
  selectedServiceDurationMinutes: number;
  onSelectTime: (startAt: number) => void;
}) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={props.onAutoSelect}
        className="rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-sm font-semibold text-neutral-900">
          Auto-vælg næste ledige
        </Text>
      </Pressable>

      <View className="overflow-hidden">
        <Pressable
          accessibilityRole="button"
          onPress={props.onToggleOpen}
          className="flex-row items-center justify-between px-3 py-3"
        >
          <Text selectable className="text-sm font-semibold text-neutral-900">
            {props.slots.length} ledige tider
          </Text>
          <Text selectable className="text-base text-neutral-500">
            {props.isTimesOpen ? "−" : "+"}
          </Text>
        </Pressable>

        {props.isTimesOpen ? (
          <View className="gap-2 border-t border-neutral-100 p-3">
            {props.slots.length > 0 ? (
              props.slots.map((slot) => {
                const time = getTimeFromDate(new Date(slot.startAt));
                const endTime = getTimeFromDate(new Date(slot.endAt));
                const isSelected = props.selectedSlotStartAt === slot.startAt;

                return (
                  <Pressable
                    key={slot.startAt}
                    accessibilityRole="button"
                    onPress={() => props.onSelectTime(slot.startAt)}
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
                          isSelected ? "text-neutral-200" : "text-neutral-500"
                        }`}
                      >
                        {props.selectedServiceDurationMinutes} min
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Text selectable className="text-sm text-neutral-500">
                Ingen ledige tider på den valgte dato for denne kombination.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </>
  );
}

export function SalonStep(props: {
  salons: {
    _id: string;
    name: string;
    city: string;
    addressLine1: string;
  }[];
  selectedSalonId: string | null;
  onSelectSalon: (salonId: string) => void;
}) {
  return (
    <>
      <Text selectable className="text-base font-semibold text-neutral-900">
        1. Vælg salon
      </Text>
      {props.salons.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3 py-1">
            {props.salons.map((salon) => (
              <BookingOptionChip
                key={salon._id}
                title={salon.name}
                subtitle={`${salon.city} • ${salon.addressLine1}`}
                selected={salon._id === props.selectedSalonId}
                className="w-60"
                onPress={() => props.onSelectSalon(salon._id)}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text selectable className="text-sm text-neutral-500">
          Ingen saloner er oprettet endnu.
        </Text>
      )}
    </>
  );
}

export function SummaryStep(props: {
  selectedSalonName: string | null;
  selectedService: { name: string; durationMinutes: number } | null;
  selectedStylistName: string | null;
  selectedSlotStartAt: number | null;
  endTime: string | null;
  customerNote: string;
  setCustomerNote: (value: string) => void;
  bookingReason: string | null;
  isBookingReady: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  confirmationText: string | null;
}) {
  return (
    <>
      <Text selectable className="text-base font-semibold text-neutral-900">
        5. Overblik
      </Text>

      <View className="gap-1">
        <Text selectable className="text-sm text-neutral-600">
          Salon:{" "}
          <Text className="font-semibold text-neutral-900">
            {props.selectedSalonName ?? "Ikke valgt"}
          </Text>
        </Text>
        <Text selectable className="text-sm text-neutral-600">
          Behandling:{" "}
          <Text className="font-semibold text-neutral-900">
            {props.selectedService
              ? `${props.selectedService.name} (${props.selectedService.durationMinutes} min)`
              : "Ikke valgt"}
          </Text>
        </Text>
        <Text selectable className="text-sm text-neutral-600">
          Medarbejder:{" "}
          <Text className="font-semibold text-neutral-900">
            {props.selectedStylistName ?? "Ikke valgt"}
          </Text>
        </Text>
        <Text selectable className="text-sm text-neutral-600">
          Dato/tid:{" "}
          <Text className="font-semibold text-neutral-900">
            {props.selectedSlotStartAt
              ? `${formatBookingDateTime(new Date(props.selectedSlotStartAt))}${
                  props.endTime ? `-${props.endTime}` : ""
                }`
              : "Ikke valgt"}
          </Text>
        </Text>
      </View>

      <View className="gap-1">
        <Text selectable className="text-xs text-neutral-500">
          Note til salonen
        </Text>
        <TextInput
          value={props.customerNote}
          onChangeText={props.setCustomerNote}
          placeholder="Tilføj evt. en kort note"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-neutral-900"
          style={{ borderCurve: "continuous" }}
        />
      </View>

      {props.bookingReason && props.selectedSlotStartAt ? (
        <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Text selectable className="text-sm text-amber-800">
            {props.bookingReason}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!props.isBookingReady || props.isSubmitting}
        onPress={props.onConfirm}
        className={`rounded-xl px-4 py-3 ${
          props.isBookingReady && !props.isSubmitting
            ? "bg-neutral-900"
            : "bg-neutral-300"
        }`}
        style={{ borderCurve: "continuous" }}
      >
        <Text
          selectable
          className="text-center text-base font-semibold text-white"
        >
          {props.isSubmitting ? "Booker..." : "Book tid"}
        </Text>
      </Pressable>

      {props.confirmationText ? (
        <View className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <Text selectable className="text-sm text-emerald-800">
            {props.confirmationText}
          </Text>
        </View>
      ) : null}
    </>
  );
}

export { ServiceCategoryPanel };
