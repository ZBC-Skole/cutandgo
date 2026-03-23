export type OverviewFilter = "upcoming" | "past";

export type OverviewAppointment = {
  id: string;
  serviceName: string;
  salonName: string;
  stylistName: string;
  startsAt: string;
  durationMinutes: number;
  statusLabel?: string;
};
