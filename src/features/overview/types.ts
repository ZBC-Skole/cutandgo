export type OverviewFilter = "upcoming" | "past";

export type OverviewAppointment = {
  id: string;
  serviceName: string;
  salonName: string;
  stylistName: string;
  startsAt: string;
  durationMinutes: number;
  address: string;
  latitude?: number;
  longitude?: number;
  referencePhotoUris?: string[];
  statusLabel?: string;
};
