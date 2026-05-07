export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_minutes: number;
  price_label: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Treatment = {
  id: string;
  service_id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Availability = {
  id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  enabled: boolean;
};

export type Booking = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service_id: string | null;
  treatment_id: string | null;
  requested_date: string;
  requested_time: string;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
};
