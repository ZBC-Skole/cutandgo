import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import {
  BookingSection,
  SalonStep,
  ServiceCategoryPanel,
  SummaryStep,
  TimeSlotList,
} from "@/features/booking/components/booking-sections";
import { BookingOptionChip } from "@/features/booking/components/booking-option-chip";
import { useBookingFlow } from "@/features/booking/hooks/use-booking-flow";
import { ScrollView, Text, View } from "react-native";

export function BookingScreen() {
  const booking = useBookingFlow();

  if (booking.isLoading) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-10"
    >
      <BookingSection>
        <SalonStep
          salons={booking.salons}
          selectedSalonId={booking.selectedSalonId}
          onSelectSalon={(salonId) =>
            booking.handleSelectSalon(salonId as Id<"salons">)
          }
        />
      </BookingSection>

      <BookingSection>
        <Text selectable className="text-base font-semibold text-neutral-900">
          2. Vælg behandling
        </Text>
        <View className="gap-2">
          {booking.categories.length > 0 ? (
            booking.categories.map((category) => (
              <ServiceCategoryPanel
                key={category.id}
                category={category}
                isOpen={booking.openCategoryId === category.id}
                selectedServiceId={booking.selectedService?.id ?? null}
                onToggle={() =>
                  booking.setOpenCategoryId((current) =>
                    current === category.id ? "" : category.id,
                  )
                }
                onSelectService={(service) =>
                  booking.handleSelectService(service.id as Id<"services">)
                }
              />
            ))
          ) : (
            <Text selectable className="text-sm text-neutral-500">
              Ingen behandlinger er aktive i den valgte salon endnu.
            </Text>
          )}
        </View>
      </BookingSection>

      <BookingSection>
        <Text selectable className="text-base font-semibold text-neutral-900">
          3. Vælg medarbejder
        </Text>
        {booking.stylists.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3 py-1">
              {booking.stylists.map((stylist) => (
                <BookingOptionChip
                  key={stylist.id}
                  title={stylist.name}
                  subtitle={stylist.role}
                  selected={stylist.id === booking.selectedStylistId}
                  className="w-55"
                  onPress={() => booking.handleSelectStylist(stylist.id)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text selectable className="text-sm text-neutral-500">
            Ingen medarbejdere fundet til den valgte salon.
          </Text>
        )}
      </BookingSection>

      <BookingSection>
        <Text selectable className="text-base font-semibold text-neutral-900">
          4. Vælg dato og tidspunkt
        </Text>
        {booking.selectedService && booking.selectedStylistId ? (
          <>
            <Text
              selectable
              className="text-xs uppercase tracking-wide text-neutral-500"
            >
              Dato
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {booking.dateOptions.map((dateOption) => (
                  <BookingOptionChip
                    key={dateOption.key}
                    title={dateOption.label}
                    selected={dateOption.key === booking.selectedDateKey}
                    className="min-w-27"
                    onPress={() => booking.handleSelectDate(dateOption.key)}
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

            <TimeSlotList
              isTimesOpen={booking.isTimesOpen}
              onToggleOpen={() => booking.setIsTimesOpen((current) => !current)}
              onAutoSelect={booking.handleAutoSelectNextAvailable}
              slots={booking.predefinedStartTimesForSelectedDate}
              selectedSlotStartAt={booking.selectedSlotStartAt}
              selectedServiceDurationMinutes={
                booking.selectedService.durationMinutes
              }
              onSelectTime={booking.handleSelectTime}
            />
          </>
        ) : (
          <View className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <Text selectable className="text-sm text-blue-800">
              Vælg behandling og medarbejder først. Derefter hentes ledige tider
              direkte fra systemet.
            </Text>
          </View>
        )}
      </BookingSection>

      <BookingSection>
        <SummaryStep
          selectedSalonName={
            booking.salons.find((s) => s._id === booking.selectedSalonId)
              ?.name ?? null
          }
          selectedService={booking.selectedService}
          selectedStylistName={
            booking.stylists.find((s) => s.id === booking.selectedStylistId)
              ?.name ?? null
          }
          selectedSlotStartAt={booking.selectedSlotStartAt}
          endTime={booking.bookingValidation.endTime}
          customerNote={booking.customerNote}
          setCustomerNote={booking.setCustomerNote}
          bookingReason={booking.bookingValidation.reason}
          isBookingReady={booking.isBookingReady}
          isSubmitting={booking.isSubmitting}
          onConfirm={() => {
            void booking.handleConfirmBooking();
          }}
          confirmationText={booking.confirmationText}
        />
      </BookingSection>
    </ScrollView>
  );
}
