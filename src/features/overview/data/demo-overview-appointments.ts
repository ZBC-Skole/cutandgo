import type { OverviewAppointment } from "@/features/overview/types";

function createDateAt(daysOffset: number, hours: number, minutes: number) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export const demoOverviewAppointments: OverviewAppointment[] = [
  {
    id: "upcoming-1",
    serviceName: "Herreklip & Styling",
    salonName: "SALON CITY",
    stylistName: "Mads Jensen",
    startsAt: createDateAt(1, 14, 30),
    durationMinutes: 45,
    statusLabel: "NÆSTE",
  },
  {
    id: "upcoming-2",
    serviceName: "Skægtrimning",
    salonName: "Salon City",
    stylistName: "Mads J.",
    startsAt: createDateAt(2, 10, 15),
    durationMinutes: 20,
  },
  {
    id: "upcoming-3",
    serviceName: "Dameklip",
    salonName: "Cut&Go Frederiksberg",
    stylistName: "Sara",
    startsAt: createDateAt(4, 9, 0),
    durationMinutes: 45,
  },
  {
    id: "upcoming-4",
    serviceName: "Bundfarve",
    salonName: "Cut&Go København C",
    stylistName: "Amalie",
    startsAt: createDateAt(8, 11, 0),
    durationMinutes: 90,
  },
  {
    id: "past-1",
    serviceName: "Herreklip & Styling",
    salonName: "Salon City",
    stylistName: "Mads Jensen",
    startsAt: createDateAt(-1, 16, 0),
    durationMinutes: 45,
  },
  {
    id: "past-2",
    serviceName: "Skægtrim",
    salonName: "Cut&Go Frederiksberg",
    stylistName: "Jonas",
    startsAt: createDateAt(-4, 12, 30),
    durationMinutes: 20,
  },
  {
    id: "past-3",
    serviceName: "Børneklip",
    salonName: "Cut&Go København C",
    stylistName: "Amalie",
    startsAt: createDateAt(-6, 15, 15),
    durationMinutes: 25,
  },
  {
    id: "past-4",
    serviceName: "Helfarve + finish",
    salonName: "Cut&Go Frederiksberg",
    stylistName: "Sara",
    startsAt: createDateAt(-11, 10, 0),
    durationMinutes: 120,
  },
  {
    id: "past-5",
    serviceName: "Føn og styling",
    salonName: "Cut&Go København C",
    stylistName: "Mikkel",
    startsAt: createDateAt(-16, 13, 45),
    durationMinutes: 30,
  },
  {
    id: "past-6",
    serviceName: "Dameklip",
    salonName: "Cut&Go Frederiksberg",
    stylistName: "Sara",
    startsAt: createDateAt(-20, 9, 30),
    durationMinutes: 45,
  },
];
