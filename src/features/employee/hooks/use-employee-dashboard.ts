import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

export function formatDateTime(value: number) {
  return new Date(value).toLocaleString("da-DK", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function roundToNextQuarter(timestamp: number) {
  const quarter = 15 * 60 * 1000;
  return Math.ceil(timestamp / quarter) * quarter;
}

function getEndOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

const activeBookingStatuses = new Set(["booked", "confirmed"]);

export const statusLabelByKey: Record<string, string> = {
  booked: "Booket",
  confirmed: "Bekræftet",
  completed: "Gennemført",
  cancelled_by_customer: "Aflyst af kunde",
  cancelled_by_salon: "Aflyst af salon",
  no_show: "No-show",
};

export function useEmployeeDashboard() {
  const schedule = useQuery(
    api.backend.domains.bookings.index.getMyEmployeeSchedule,
    {},
  );
  const salons = useQuery(
    api.backend.domains.staff.index.getMyActiveSalons,
    {},
  );

  const cancelBooking = useMutation(
    api.backend.domains.bookings.index.cancelBooking,
  );
  const markCompleted = useMutation(
    api.backend.domains.bookings.index.markCompleted,
  );
  const rescheduleMyBooking = useMutation(
    api.backend.domains.bookings.index.rescheduleMyBooking,
  );
  const reportMySickLeave = useMutation(
    api.backend.domains.staff.index.reportMySickLeave,
  );
  const resolveMySickLeave = useMutation(
    api.backend.domains.staff.index.resolveMySickLeave,
  );

  const [isMutatingBookingId, setIsMutatingBookingId] = useState<string | null>(
    null,
  );
  const [isSubmittingSickLeave, setIsSubmittingSickLeave] = useState(false);
  const [isResolvingSickLeave, setIsResolvingSickLeave] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState<Id<"salons"> | null>(
    null,
  );
  const [sickStartAt, setSickStartAt] = useState(() =>
    roundToNextQuarter(Date.now()),
  );
  const [sickReason, setSickReason] = useState("Sygdom");

  const list = useMemo(() => schedule ?? [], [schedule]);
  const activeSalons = useMemo(() => salons ?? [], [salons]);

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

  async function handleComplete(bookingId: Id<"bookings">) {
    Alert.alert(
      "Marker som udført",
      "Markér denne booking som gennemført og frigør tiden nu?",
      [
        { text: "Nej", style: "cancel" },
        {
          text: "Ja, marker udført",
          onPress: () => {
            void (async () => {
              try {
                setIsMutatingBookingId(bookingId);
                await markCompleted({ bookingId });
              } catch (error) {
                Alert.alert("Kunne ikke markere som udført", String(error));
              } finally {
                setIsMutatingBookingId(null);
              }
            })();
          },
        },
      ],
    );
  }

  async function handleReportSickLeave() {
    if (!selectedSalonId) {
      Alert.alert("Vælg salon", "Vælg en salon før du melder dig syg.");
      return;
    }

    try {
      setIsSubmittingSickLeave(true);
      const result = await reportMySickLeave({
        salonId: selectedSalonId,
        startAt: sickStartAt,
        endAt: getEndOfDay(sickStartAt),
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

  async function handleResolveSickLeave() {
    try {
      setIsResolvingSickLeave(true);
      const result = await resolveMySickLeave({
        salonId: selectedSalonId ?? undefined,
      });
      if (result.resolvedCount > 0) {
        Alert.alert(
          "Meldt rask",
          `${String(result.resolvedCount)} fraværsperiode(r) blev afsluttet.`,
        );
      } else {
        Alert.alert("Meldt rask", "Ingen aktive fraværsperioder at afslutte.");
      }
    } catch (error) {
      Alert.alert("Kunne ikke melde rask", String(error));
    } finally {
      setIsResolvingSickLeave(false);
    }
  }

  return {
    isLoading: !schedule || !salons,
    upcoming,
    past,
    activeSalons,
    selectedSalonId,
    setSelectedSalonId,
    sickStartAt,
    setSickStartAt,
    sickReason,
    setSickReason,
    isSubmittingSickLeave,
    isResolvingSickLeave,
    isMutatingBookingId,
    handleCancel,
    handleShift,
    handleComplete,
    handleReportSickLeave,
    handleResolveSickLeave,
  };
}
