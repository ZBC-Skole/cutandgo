import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

function formatDateTime(value: number) {
  return new Date(value).toLocaleString("da-DK", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roundToNextQuarter(timestamp: number) {
  const quarter = 15 * 60 * 1000;
  return Math.ceil(timestamp / quarter) * quarter;
}

const activeBookingStatuses = new Set(["booked", "confirmed"]);

export function EmployeeDashboardScreen() {
  const schedule = useQuery(api.bookings.getMyEmployeeSchedule, {});
  const salons = useQuery(api.staff.getMyActiveSalons, {});

  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const rescheduleMyBooking = useMutation(api.bookings.rescheduleMyBooking);
  const reportMySickLeave = useMutation(api.staff.reportMySickLeave);

  const [isMutatingBookingId, setIsMutatingBookingId] = useState<string | null>(
    null,
  );
  const [isSubmittingSickLeave, setIsSubmittingSickLeave] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState<Id<"salons"> | null>(
    null,
  );
  const [sickStartAt, setSickStartAt] = useState(() =>
    roundToNextQuarter(Date.now()),
  );
  const [sickDurationHours, setSickDurationHours] = useState("8");
  const [sickReason, setSickReason] = useState("Sygdom");

  const list = useMemo(() => schedule ?? [], [schedule]);

  const upcoming = useMemo(
    () =>
      list
        .filter(
          (item) =>
            item.endAt >= Date.now() && activeBookingStatuses.has(item.status),
        )
        .slice(0, 30),
    [list],
  );
  const past = useMemo(
    () =>
      list
        .filter(
          (item) =>
            item.endAt < Date.now() || !activeBookingStatuses.has(item.status),
        )
        .slice(-10)
        .reverse(),
    [list],
  );

  const activeSalons = useMemo(() => salons ?? [], [salons]);

  useEffect(() => {
    if (!selectedSalonId && activeSalons.length > 0) {
      setSelectedSalonId(activeSalons[0].salonId);
    }
  }, [activeSalons, selectedSalonId]);

  async function handleCancel(bookingId: Id<"bookings">) {
    Alert.alert(
      "Aflys booking",
      "Er du sikker på at du vil aflyse denne booking?",
      [
        { text: "Nej", style: "cancel" },
        {
          text: "Aflys",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setIsMutatingBookingId(bookingId);
                await cancelBooking({
                  bookingId,
                  reason: "Aflyst af medarbejder",
                });
              } catch (error) {
                Alert.alert("Kunne ikke aflyse", String(error));
              } finally {
                setIsMutatingBookingId(null);
              }
            })();
          },
        },
      ],
    );
  }

  async function handleShift(
    bookingId: Id<"bookings">,
    currentStartAt: number,
    deltaMinutes: number,
  ) {
    try {
      setIsMutatingBookingId(bookingId);
      await rescheduleMyBooking({
        bookingId,
        newStartAt: currentStartAt + deltaMinutes * 60_000,
      });
    } catch (error) {
      Alert.alert("Kunne ikke flytte tiden", String(error));
    } finally {
      setIsMutatingBookingId(null);
    }
  }

  async function handleReportSickLeave() {
    if (!selectedSalonId) {
      Alert.alert("Vælg salon", "Vælg en salon før du melder dig syg.");
      return;
    }

    const durationHours = Number(sickDurationHours);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      Alert.alert(
        "Ugyldig varighed",
        "Varighed skal være et tal større end 0.",
      );
      return;
    }

    try {
      setIsSubmittingSickLeave(true);
      const endAt = sickStartAt + Math.round(durationHours * 60) * 60_000;
      const result = await reportMySickLeave({
        salonId: selectedSalonId,
        startAt: sickStartAt,
        endAt,
        reason: sickReason.trim() || undefined,
      });
      Alert.alert(
        "Fravær registreret",
        `Fravær oprettet. ${String(result.cancelledCount)} booking(er) blev aflyst.`,
      );
    } catch (error) {
      Alert.alert("Kunne ikke registrere fravær", String(error));
    } finally {
      setIsSubmittingSickLeave(false);
    }
  }

  if (!schedule || !salons) {
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

        {activeSalons.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {activeSalons.map((salon) => {
              const selected = selectedSalonId === salon.salonId;
              return (
                <Pressable
                  key={salon.salonId}
                  onPress={() => setSelectedSalonId(salon.salonId)}
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
            onPress={() => setSickStartAt(roundToNextQuarter(Date.now()))}
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
              setSickStartAt(
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
          Start: {formatDateTime(sickStartAt)}
        </Text>

        <TextInput
          value={sickDurationHours}
          onChangeText={setSickDurationHours}
          placeholder="Varighed i timer"
          keyboardType="numeric"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-neutral-900"
          style={{ borderCurve: "continuous" }}
        />

        <TextInput
          value={sickReason}
          onChangeText={setSickReason}
          placeholder="Årsag"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-neutral-900"
          style={{ borderCurve: "continuous" }}
        />

        <Pressable
          disabled={isSubmittingSickLeave || activeSalons.length === 0}
          onPress={() => {
            void handleReportSickLeave();
          }}
          className={`rounded-xl px-4 py-3 ${
            isSubmittingSickLeave || activeSalons.length === 0
              ? "bg-neutral-300"
              : "bg-neutral-900"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className="text-center text-base font-semibold text-white"
          >
            {isSubmittingSickLeave ? "Gemmer..." : "Meld syg"}
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

        {upcoming.length === 0 ? (
          <Text selectable className="text-sm text-neutral-500">
            Ingen kommende tider.
          </Text>
        ) : (
          upcoming.map((booking) => {
            const isBusy = isMutatingBookingId === booking.bookingId;
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
                  Status: {booking.status}
                </Text>

                {booking.customerNote ? (
                  <Text selectable className="text-xs text-neutral-500">
                    Note: {booking.customerNote}
                  </Text>
                ) : null}

                {isActive ? (
                  <View className="flex-row gap-2">
                    <Pressable
                      disabled={isBusy}
                      onPress={() => {
                        void handleShift(
                          booking.bookingId,
                          booking.startAt,
                          -15,
                        );
                      }}
                      className={`flex-1 rounded-lg px-3 py-2 ${isBusy ? "bg-neutral-200" : "bg-neutral-200"}`}
                      style={{ borderCurve: "continuous" }}
                    >
                      <Text
                        selectable
                        className="text-center text-xs font-semibold text-neutral-800"
                      >
                        Flyt -15 min
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={isBusy}
                      onPress={() => {
                        void handleShift(
                          booking.bookingId,
                          booking.startAt,
                          15,
                        );
                      }}
                      className={`flex-1 rounded-lg px-3 py-2 ${isBusy ? "bg-neutral-200" : "bg-neutral-200"}`}
                      style={{ borderCurve: "continuous" }}
                    >
                      <Text
                        selectable
                        className="text-center text-xs font-semibold text-neutral-800"
                      >
                        Flyt +15 min
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={isBusy}
                      onPress={() => {
                        void handleCancel(booking.bookingId);
                      }}
                      className={`flex-1 rounded-lg px-3 py-2 ${isBusy ? "bg-red-100" : "bg-red-100"}`}
                      style={{ borderCurve: "continuous" }}
                    >
                      <Text
                        selectable
                        className="text-center text-xs font-semibold text-red-700"
                      >
                        {isBusy ? "Arbejder..." : "Aflys"}
                      </Text>
                    </Pressable>
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
        {past.length === 0 ? (
          <Text selectable className="text-sm text-neutral-500">
            Ingen tidligere tider.
          </Text>
        ) : (
          past.map((booking) => (
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
