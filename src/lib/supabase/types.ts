export type BookingStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled";

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
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
  /** Overrides service.duration_minutes for booking length when set */
  duration_minutes: number | null;
  /** Optional price label for this treatment or area */
  price_label: string | null;
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

export type Policy = {
  id: string;
  title: string;
  slug: string;
  body: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
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
  /** Set when Google Calendar API creates an event for this booking */
  google_calendar_event_id?: string | null;
  google_calendar_sync_error?: string | null;
  google_calendar_sync_attempted_at?: string | null;
  google_calendar_last_success_at?: string | null;
  /** Deposit taken at checkout (minor units, e.g. pence) */
  deposit_cents?: number | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  created_at: string;
};

export type BookingSettings = {
  id: boolean;
  slot_interval_minutes: number;
  buffer_minutes: number;
  minimum_notice_hours: number;
  deposit_rule: string;
  /** When true, public booking requires Stripe Checkout for deposit_amount_cents before confirming */
  deposit_enabled: boolean;
  /** Amount in smallest currency unit (e.g. pence for GBP) */
  deposit_amount_cents: number;
  booking_mode: "instant" | "request";
  notification_email: string;
  admin_email: string;
  updated_at: string;
};
