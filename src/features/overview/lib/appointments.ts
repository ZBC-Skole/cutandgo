import type {
  OverviewAppointment,
  OverviewFilter,
} from "@/features/overview/types";

export function splitOverviewAppointments(
  appointments: OverviewAppointment[],
  now: Date,
) {
  const nowMs = now.getTime();

  const upcoming = appointments
    .filter((appointment) => new Date(appointment.startsAt).getTime() > nowMs)
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );

  const past = appointments
    .filter((appointment) => new Date(appointment.startsAt).getTime() <= nowMs)
    .sort(
      (left, right) =>
        new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
    );

  return { upcoming, past };
}

export function parseOverviewFilter(value: string | undefined): OverviewFilter {
  return value === "past" ? "past" : "upcoming";
}

export function getOverviewFilterTitle(filter: OverviewFilter) {
  return filter === "past" ? "Tidligere bookinger" : "Kommende tider";
}
