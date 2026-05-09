"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { notifyBookingByEmail } from "@/app/actions/booking-email";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import type {
  Availability,
  Booking,
  BookingSettings,
  Service,
  Treatment,
} from "@/lib/supabase/types";

type ServiceWithTreatments = Service & { treatments: Treatment[] };

const defaultSettings: Pick<
  BookingSettings,
  "slot_interval_minutes" | "minimum_notice_hours" | "booking_mode"
> = {
  slot_interval_minutes: 15,
  minimum_notice_hours: 24,
  booking_mode: "instant",
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function BookPage() {
  const [services, setServices] = useState<ServiceWithTreatments[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const supabaseReady = hasSupabaseConfig();
  const supabase = useMemo(
    () => (supabaseReady ? createBrowserSupabaseClient() : null),
    [supabaseReady],
  );

  useEffect(() => {
    async function loadBookingData() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const [servicesResult, treatmentsResult, availabilityResult, bookingsResult, settingsResult] =
        await Promise.all([
          supabase.from("services").select("*").eq("active", true).order("sort_order"),
          supabase.from("treatments").select("*").eq("active", true).order("sort_order"),
          supabase.from("availability").select("*").eq("enabled", true),
          supabase.from("bookings").select("*").neq("status", "cancelled"),
          supabase.from("booking_settings").select("*").single(),
        ]);

      const treatments = ((treatmentsResult.data ?? []) as Treatment[]).map(
        (treatment) => ({
          ...treatment,
          duration_minutes: treatment.duration_minutes ?? null,
          price_label: treatment.price_label ?? null,
        }),
      );
      const loadedServices = ((servicesResult.data ?? []) as Service[]).map(
        (service) => ({
          ...service,
          treatments: treatments
            .filter((treatment) => treatment.service_id === service.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        }),
      );

      setServices(loadedServices);
      setAvailability((availabilityResult.data ?? []) as Availability[]);
      setBookings((bookingsResult.data ?? []) as Booking[]);
      if (settingsResult.data) setSettings(settingsResult.data as BookingSettings);
      setSelectedServiceId(loadedServices[0]?.id ?? "");
      setSelectedTreatmentId(loadedServices[0]?.treatments[0]?.id ?? "");
      setLoading(false);
    }

    loadBookingData();
  }, [supabase]);

  const selectedService = services.find(
    (service) => service.id === selectedServiceId,
  );

  const selectedTreatment = selectedService?.treatments.find(
    (treatment) => treatment.id === selectedTreatmentId,
  );

  const bookingDurationMinutes = useMemo(() => {
    return (
      selectedTreatment?.duration_minutes ??
      selectedService?.duration_minutes ??
      45
    );
  }, [selectedService, selectedTreatment]);

  const dateOptions = useMemo(() => {
    const options: string[] = [];
    const today = new Date();
    for (let index = 0; index < 28; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const mondayFirstDay = (date.getDay() + 6) % 7;
      if (availability.some((slot) => slot.day_of_week === mondayFirstDay)) {
        options.push(formatDate(date));
      }
    }
    return options;
  }, [availability]);

  const effectiveSelectedDate = selectedDate || dateOptions[0] || "";

  const timeOptions = useMemo(() => {
    if (!effectiveSelectedDate) return [];

    const date = new Date(`${effectiveSelectedDate}T12:00:00`);
    const mondayFirstDay = (date.getDay() + 6) % 7;
    const slot = availability.find(
      (item) => item.day_of_week === mondayFirstDay,
    );

    if (!slot?.opens_at || !slot.closes_at) return [];

    const now = new Date();
    const minBookTime = new Date(
      now.getTime() + settings.minimum_notice_hours * 60 * 60 * 1000,
    );
    const start = minutesFromTime(slot.opens_at);
    const end =
      minutesFromTime(slot.closes_at) - bookingDurationMinutes;

    const existing = new Set(
      bookings
        .filter((booking) => booking.requested_date === effectiveSelectedDate)
        .map((booking) => booking.requested_time.slice(0, 5)),
    );

    const slots: string[] = [];
    for (
      let minutes = start;
      minutes <= end;
      minutes += settings.slot_interval_minutes
    ) {
      const time = timeFromMinutes(minutes);
      const slotDate = new Date(`${effectiveSelectedDate}T${time}:00`);
      if (slotDate < minBookTime) continue;
      if (existing.has(time)) continue;
      slots.push(time);
    }

    return slots;
  }, [
    availability,
    bookings,
    effectiveSelectedDate,
    bookingDurationMinutes,
    settings,
  ]);

  const effectiveSelectedTime =
    selectedTime && timeOptions.includes(selectedTime)
      ? selectedTime
      : timeOptions[0] || "";

  function updateService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    setSelectedServiceId(serviceId);
    setSelectedTreatmentId(service?.treatments[0]?.id ?? "");
    setSelectedTime("");
  }

  async function createBooking() {
    if (!supabase) return;

    if (
      !clientName ||
      !clientEmail ||
      !selectedServiceId ||
      !effectiveSelectedDate ||
      !effectiveSelectedTime
    ) {
      setMessage("Please complete your name, email, service, date, and time.");
      return;
    }

    const bookingId = crypto.randomUUID();
    const { error } = await supabase.from("bookings").insert({
      id: bookingId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      service_id: selectedServiceId,
      treatment_id: selectedTreatmentId || null,
      requested_date: effectiveSelectedDate,
      requested_time: effectiveSelectedTime,
      notes: notes || null,
      status: settings.booking_mode === "instant" ? "confirmed" : "pending",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    void notifyBookingByEmail(bookingId, "created");

    setMessage(
      settings.booking_mode === "instant"
        ? "Your booking is confirmed. We will contact you if we need anything else."
        : "Your request has been sent. We will confirm your booking shortly.",
    );
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setNotes("");
  }

  return (
    <main className="min-h-screen bg-[#f6f0e7] text-[#2a211b]">
      <section className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#776b5f]">
            Back to website
          </Link>
          <span className="rounded-full bg-[#fffaf2]/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#9b7a45]">
            Instant booking
          </span>
        </div>

        <div className="rounded-[2.6rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/70 p-5 shadow-2xl shadow-[#8b765d]/10 backdrop-blur-xl md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
            Book L&apos;Beau Clinique
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
            Choose your treatment and time.
          </h1>
          <p className="mt-4 max-w-2xl text-[#776b5f]">
            Select a service, pick an available slot, and your appointment will
            be saved into the scheduling studio.
          </p>

          {!supabaseReady ? (
            <div className="mt-8 rounded-2xl bg-[#f1e6d6] p-5 text-[#6f5638]">
              Supabase is not configured yet. Add the environment variables in
              Vercel and redeploy.
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 rounded-2xl bg-[#f1e6d6] p-5 text-[#6f5638]">
              Loading appointments...
            </div>
          ) : null}

          {!loading ? (
            <div className="mt-8 grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <BookingSelect
                  label="Service"
                  value={selectedServiceId}
                  onChange={updateService}
                  options={services.map((service) => ({
                    label: `${service.name} - ${service.category}`,
                    value: service.id,
                  }))}
                />
                <BookingSelect
                  label="Treatment"
                  value={selectedTreatmentId}
                  onChange={setSelectedTreatmentId}
                  options={(selectedService?.treatments ?? []).map(
                    (treatment) => ({
                      label: [
                        treatment.name,
                        treatment.price_label,
                        treatment.duration_minutes != null
                          ? `${treatment.duration_minutes} min`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                      value: treatment.id,
                    }),
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <BookingSelect
                  label="Date"
                  value={effectiveSelectedDate}
                  onChange={(value) => {
                    setSelectedDate(value);
                    setSelectedTime("");
                  }}
                  options={dateOptions.map((date) => ({
                    label: displayDate(date),
                    value: date,
                  }))}
                />
                <BookingSelect
                  label="Time"
                  value={effectiveSelectedTime}
                  onChange={setSelectedTime}
                  options={timeOptions.map((time) => ({
                    label: time,
                    value: time,
                  }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <BookingInput
                  label="Name"
                  value={clientName}
                  onChange={setClientName}
                />
                <BookingInput
                  label="Email"
                  type="email"
                  value={clientEmail}
                  onChange={setClientEmail}
                />
                <BookingInput
                  label="Phone"
                  value={clientPhone}
                  onChange={setClientPhone}
                />
              </div>

              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
                />
              </label>

              <button
                onClick={createBooking}
                className="rounded-full bg-[#111820] px-7 py-4 text-center font-semibold text-[#fffaf2]"
              >
                Confirm booking
              </button>

              {message ? (
                <p className="rounded-2xl bg-[#f1e6d6] px-5 py-4 text-sm font-semibold text-[#6f5638]">
                  {message}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function BookingInput({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
      />
    </label>
  );
}

function BookingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
      >
        {options.length === 0 ? <option value="">No options</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
