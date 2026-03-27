import LoadingView from "@/components/ui/loading-view";
import { BookingActionButton } from "@/features/employee/components/booking-action-button";
import {
  formatDateTime,
  roundToNextQuarter,
  statusLabelByKey,
  useEmployeeDashboard,
} from "@/features/employee/hooks/use-employee-dashboard";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export function EmployeeDashboardScreen() {
  const dashboard = useEmployeeDashboard();

  if (dashboard.isLoading) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-10"
    >
      <View className="gap-1">
        <Text
          selectable
          className="text-xs uppercase tracking-[2px] text-neutral-500"
        >
          Medarbejder
        </Text>
        <Text selectable className="text-2xl font-semibold text-neutral-950">
          Mine tider
        </Text>
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          Meld syg
        </Text>

        {dashboard.activeSalons.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {dashboard.activeSalons.map((salon) => {
              const selected = dashboard.selectedSalonId === salon.salonId;
              return (
                <Pressable
                  key={salon.salonId}
                  onPress={() => dashboard.setSelectedSalonId(salon.salonId)}
                  className={`rounded-full px-3 py-2 ${selected ? "bg-neutral-900" : "bg-neutral-100"}`}
                  style={{ borderCurve: "continuous" }}
                >
                  <Text
                    selectable
                    className={`text-xs font-semibold ${selected ? "text-white" : "text-neutral-700"}`}
                  >
                    {salon.salonName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text selectable className="text-sm text-neutral-500">
            Du er ikke tilknyttet en aktiv salon endnu.
          </Text>
        )}

        <View className="flex-row gap-2">
          <Pressable
            onPress={() =>
              dashboard.setSickStartAt(roundToNextQuarter(Date.now()))
            }
            className="flex-1 rounded-xl bg-neutral-100 px-3 py-2"
            style={{ borderCurve: "continuous" }}
          >
            <Text
              selectable
              className="text-center text-sm font-semibold text-neutral-700"
            >
              Fra nu
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              dashboard.setSickStartAt(
                roundToNextQuarter(Date.now() + 24 * 60 * 60 * 1000),
              )
            }
            className="flex-1 rounded-xl bg-neutral-100 px-3 py-2"
            style={{ borderCurve: "continuous" }}
          >
            <Text
              selectable
              className="text-center text-sm font-semibold text-neutral-700"
            >
              Fra i morgen
            </Text>
          </Pressable>
        </View>

        <Text selectable className="text-xs text-neutral-600">
          Start: {formatDateTime(dashboard.sickStartAt)}
        </Text>

        <TextInput
          value={dashboard.sickDurationHours}
          onChangeText={dashboard.setSickDurationHours}
          placeholder="Varighed i timer"
          keyboardType="numeric"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-neutral-900"
          style={{ borderCurve: "continuous" }}
        />

        <TextInput
          value={dashboard.sickReason}
          onChangeText={dashboard.setSickReason}
          placeholder="Årsag"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-neutral-900"
          style={{ borderCurve: "continuous" }}
        />

        <Pressable
          disabled={
            dashboard.isSubmittingSickLeave ||
            dashboard.activeSalons.length === 0
          }
          onPress={() => {
            void dashboard.handleReportSickLeave();
          }}
          className={`rounded-xl px-4 py-3 ${
            dashboard.isSubmittingSickLeave ||
            dashboard.activeSalons.length === 0
              ? "bg-neutral-300"
              : "bg-neutral-900"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className="text-center text-base font-semibold text-white"
          >
            {dashboard.isSubmittingSickLeave ? "Gemmer..." : "Meld syg"}
          </Text>
        </Pressable>

        <Pressable
          disabled={dashboard.isResolvingSickLeave}
          onPress={() => {
            void dashboard.handleResolveSickLeave();
          }}
          className={`rounded-xl px-4 py-3 ${
            dashboard.isResolvingSickLeave ? "bg-neutral-200" : "bg-emerald-100"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className={`text-center text-base font-semibold ${
              dashboard.isResolvingSickLeave
                ? "text-neutral-600"
                : "text-emerald-800"
            }`}
          >
            {dashboard.isResolvingSickLeave ? "Arbejder..." : "Meld rask"}
          </Text>
        </Pressable>
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          Kommende bookinger
        </Text>
        {dashboard.upcoming.length === 0 ? (
          <Text selectable className="text-sm text-neutral-500">
            Ingen kommende tider.
          </Text>
        ) : (
          dashboard.upcoming.map((booking) => {
            const isBusy = dashboard.isMutatingBookingId === booking.bookingId;
            const isActive =
              booking.status === "booked" || booking.status === "confirmed";
            return (
              <View
                key={booking.bookingId}
                className="gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                style={{ borderCurve: "continuous" }}
              >
                <Text
                  selectable
                  className="text-sm font-semibold text-neutral-900"
                >
                  {booking.serviceName} · {booking.customerName}
                </Text>
                <Text selectable className="text-xs text-neutral-600">
                  {booking.salonName}
                </Text>
                <Text selectable className="text-xs text-neutral-600">
                  {formatDateTime(booking.startAt)} -{" "}
                  {formatDateTime(booking.endAt)}
                </Text>
                <Text selectable className="text-xs text-neutral-500">
                  Status: {statusLabelByKey[booking.status] ?? booking.status}
                </Text>
                {booking.customerNote ? (
                  <Text selectable className="text-xs text-neutral-500">
                    Note: {booking.customerNote}
                  </Text>
                ) : null}

                {isActive ? (
                  <View className="gap-2 pt-1">
                    <BookingActionButton
                      label={isBusy ? "Opdaterer..." : "Marker som udført"}
                      disabled={isBusy}
                      tone="success"
                      onPress={() => {
                        void dashboard.handleComplete(booking.bookingId);
                      }}
                    />
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <BookingActionButton
                          label="Flyt 15 min tidligere"
                          disabled={isBusy}
                          onPress={() => {
                            void dashboard.handleShift(
                              booking.bookingId,
                              booking.startAt,
                              -15,
                            );
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <BookingActionButton
                          label="Flyt 15 min senere"
                          disabled={isBusy}
                          onPress={() => {
                            void dashboard.handleShift(
                              booking.bookingId,
                              booking.startAt,
                              15,
                            );
                          }}
                        />
                      </View>
                    </View>
                    <BookingActionButton
                      label="Aflys booking"
                      disabled={isBusy}
                      tone="danger"
                      onPress={() => {
                        void dashboard.handleCancel(booking.bookingId);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-base font-semibold text-neutral-900">
          Tidligere
        </Text>
        {dashboard.past.length === 0 ? (
          <Text selectable className="text-sm text-neutral-500">
            Ingen tidligere tider.
          </Text>
        ) : (
          dashboard.past.map((booking) => (
            <View
              key={booking.bookingId}
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
              style={{ borderCurve: "continuous" }}
            >
              <Text
                selectable
                className="text-sm font-semibold text-neutral-900"
              >
                {booking.serviceName} · {booking.customerName}
              </Text>
              <Text selectable className="text-xs text-neutral-600">
                {formatDateTime(booking.startAt)}
              </Text>
              <Text selectable className="text-xs text-neutral-500">
                {booking.status}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
