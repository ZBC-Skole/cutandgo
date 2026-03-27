export type OverviewFilter = "upcoming" | "past";

export type OverviewAppointment = {
  id: string;
  serviceName: string;
  salonName: string;
  stylistName: string;
  startsAt: string;
  durationMinutes: number;
  address: string;
  status?:
    | "booked"
    | "confirmed"
    | "completed"
    | "cancelled_by_customer"
    | "cancelled_by_salon"
    | "no_show";
  latitude?: number;
  longitude?: number;
  referencePhotoUris?: string[];
  statusLabel?: string;
};
