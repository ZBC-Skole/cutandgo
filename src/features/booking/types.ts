export type TimeInterval = {
  start: string;
  end: string;
};

export type Salon = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export type BookingService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceDkk: number;
};

export type ServiceCategory = {
  id: string;
  name: string;
  services: BookingService[];
};

export type Stylist = {
  id: string;
  name: string;
  role: string;
  salonIds: string[];
  workingHours: {
    start: string;
    end: string;
  };
  blocked: TimeInterval[];
};
