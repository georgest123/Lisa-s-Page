"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { notifyBookingByEmail } from "@/app/actions/booking-email";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import type {
  Availability,
  Booking,
  BookingSettings,
  BookingStatus,
  Service,
  Treatment,
} from "@/lib/supabase/types";

type AdminTab = "overview" | "services" | "schedule" | "bookings";
type ServiceWithTreatments = Service & { treatments: Treatment[] };

type TreatmentInsertRow = {
  service_id: string;
  name: string;
  active: boolean;
  sort_order: number;
  duration_minutes: number | null;
  price_label: string | null;
};

async function insertTreatmentsWithFallback(
  supabase: SupabaseClient,
  rows: TreatmentInsertRow[],
): Promise<{ error: { message: string; code?: string } | null }> {
  if (rows.length === 0) return { error: null };

  const attempt = await supabase.from("treatments").insert(rows);
  if (!attempt.error) return { error: null };

  const messageLower = attempt.error.message?.toLowerCase() ?? "";
  const missingOptionalColumns =
    attempt.error.code === "42703" ||
    messageLower.includes("duration_minutes") ||
    messageLower.includes("price_label") ||
    messageLower.includes("does not exist");

  if (!missingOptionalColumns) return { error: attempt.error };

  const minimal = rows.map((row) => ({
    service_id: row.service_id,
    name: row.name,
    active: row.active,
    sort_order: row.sort_order,
  }));
  const retry = await supabase.from("treatments").insert(minimal);
  return { error: retry.error };
}

const adminEmail = "lbeauclinique@gmail.com";

const defaultSettings: BookingSettings = {
  id: true,
  slot_interval_minutes: 15,
  buffer_minutes: 10,
  minimum_notice_hours: 24,
  deposit_rule: "Optional later",
  booking_mode: "instant",
  notification_email: adminEmail,
  admin_email: adminEmail,
  updated_at: "",
};

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [user, setUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState(adminEmail);
  const [loginCode, setLoginCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [services, setServices] = useState<ServiceWithTreatments[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<BookingSettings>(defaultSettings);
  const [message, setMessage] = useState("");
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [addBookingSaving, setAddBookingSaving] = useState(false);
  const [addBookingForm, setAddBookingForm] = useState({
    date: "",
    time: "09:30",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    serviceId: "",
    treatmentId: "",
    notes: "",
    status: "confirmed" as BookingStatus,
  });
  const supabaseReady = hasSupabaseConfig();
  const [loading, setLoading] = useState(supabaseReady);
  const supabase = useMemo(
    () => (supabaseReady ? createBrowserSupabaseClient() : null),
    [supabaseReady],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (user) {
      loadAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!addBookingOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAddBookingOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addBookingOpen]);

  const activeServices = services.filter((service) => service.active).length;
  const pendingBookings = bookings.filter(
    (booking) => booking.status === "pending",
  ).length;

  const weekDates = useMemo(() => {
    const monday = startOfMonday(new Date());
    monday.setDate(monday.getDate() + calendarWeekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      return day;
    });
  }, [calendarWeekOffset]);

  const bookingsThisWeek = useMemo(() => {
    const start = toISODateLocal(weekDates[0]);
    const end = toISODateLocal(weekDates[6]);
    return bookings.filter(
      (booking) =>
        booking.requested_date >= start && booking.requested_date <= end,
    );
  }, [bookings, weekDates]);

  const defaultDateForModal = useMemo(() => {
    const today = toISODateLocal(new Date());
    const start = toISODateLocal(weekDates[0]);
    const end = toISODateLocal(weekDates[6]);
    if (today >= start && today <= end) return today;
    return start;
  }, [weekDates]);

  async function loadAdminData() {
    if (!supabase) return;
    setLoading(true);
    setMessage("");

    const [servicesResult, treatmentsResult, availabilityResult, bookingsResult, settingsResult] =
      await Promise.all([
        supabase.from("services").select("*").order("sort_order"),
        supabase.from("treatments").select("*").order("sort_order"),
        supabase.from("availability").select("*").order("day_of_week"),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("booking_settings").select("*").single(),
      ]);

    if (servicesResult.error) setMessage(servicesResult.error.message);

    const loadedServices = (servicesResult.data ?? []) as Service[];
    const treatments = ((treatmentsResult.data ?? []) as Treatment[]).map(
      (treatment) => ({
        ...treatment,
        duration_minutes: treatment.duration_minutes ?? null,
        price_label: treatment.price_label ?? null,
      }),
    );
    setServices(
      loadedServices.map((service) => ({
        ...service,
        treatments: treatments
          .filter((treatment) => treatment.service_id === service.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      })),
    );
    setAvailability((availabilityResult.data ?? []) as Availability[]);
    setBookings((bookingsResult.data ?? []) as Booking[]);
    setSettings((settingsResult.data as BookingSettings | null) ?? defaultSettings);
    setLoading(false);
  }

  async function sendLoginCode() {
    if (!supabase) return;
    if (loginEmail.trim().toLowerCase() !== adminEmail) {
      setMessage(`Only ${adminEmail} can access the scheduling studio.`);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setCodeSent(true);
    setMessage("Check your email for the 6-digit login code.");
  }

  async function verifyLoginCode() {
    if (!supabase) return;
    if (!loginCode.trim()) {
      setMessage("Enter the code from your email.");
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: loginEmail,
      token: loginCode.trim(),
      type: "email",
    });

    setMessage(error ? error.message : "Login confirmed.");
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setUser(null);
  }

  function updateService(
    id: string,
    field: "name" | "category" | "description" | "price_label" | "duration_minutes",
    value: string,
  ) {
    setServices((current) =>
      current.map((service) =>
        service.id === id
          ? {
              ...service,
              [field]: field === "duration_minutes" ? Number(value) : value,
            }
          : service,
      ),
    );
  }

  function updateTreatmentRow(
    serviceId: string,
    treatmentId: string,
    field: "name" | "duration_minutes" | "price_label",
    value: string,
  ) {
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              treatments: service.treatments.map((treatment) =>
                treatment.id !== treatmentId
                  ? treatment
                  : {
                      ...treatment,
                      name:
                        field === "name"
                          ? value
                          : treatment.name,
                      duration_minutes:
                        field === "duration_minutes"
                          ? value.trim() === ""
                            ? null
                            : Number.isFinite(Number(value))
                              ? Number(value)
                              : treatment.duration_minutes
                          : treatment.duration_minutes,
                      price_label:
                        field === "price_label"
                          ? value.trim() === ""
                            ? null
                            : value
                          : treatment.price_label,
                    },
              ),
            }
          : service,
      ),
    );
  }

  function addTreatmentRow(serviceId: string) {
    const uid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `new-${crypto.randomUUID()}`
        : `new-${Date.now()}`;
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              treatments: [
                ...service.treatments,
                {
                  id: uid,
                  service_id: serviceId,
                  name: "",
                  duration_minutes: null,
                  price_label: null,
                  active: true,
                  sort_order: service.treatments.length + 1,
                  created_at: "",
                },
              ],
            }
          : service,
      ),
    );
  }

  function removeTreatmentRow(serviceId: string, treatmentId: string) {
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              treatments: service.treatments.filter(
                (treatment) => treatment.id !== treatmentId,
              ),
            }
          : service,
      ),
    );
  }

  async function saveService(service: ServiceWithTreatments) {
    if (!supabase) return;

    const { error } = await supabase.from("services").update({
      name: service.name,
      category: service.category,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price_label: service.price_label,
      image_url: service.image_url,
      active: service.active,
      sort_order: service.sort_order,
    }).eq("id", service.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    const rows = service.treatments
      .filter((treatment) => treatment.name.trim())
      .map((treatment, index) => {
        const dm = treatment.duration_minutes;
        const durationResolved =
          dm != null && Number.isFinite(Number(dm))
            ? Math.round(Number(dm))
            : null;
        return {
          service_id: service.id,
          name: treatment.name.trim(),
          active: treatment.active ?? true,
          sort_order: index + 1,
          duration_minutes: durationResolved,
          price_label: treatment.price_label?.trim() || null,
        };
      });

    const { error: deleteError } = await supabase
      .from("treatments")
      .delete()
      .eq("service_id", service.id);

    if (deleteError) {
      setMessage(`Treatments could not be updated (delete): ${deleteError.message}`);
      await loadAdminData();
      return;
    }

    if (rows.length > 0) {
      const { error: insertError } = await insertTreatmentsWithFallback(
        supabase,
        rows,
      );
      if (insertError) {
        const hint =
          insertError.message?.toLowerCase().includes("policy") ||
          insertError.message?.toLowerCase().includes("permission")
            ? " Sign in again as lbeauclinique@gmail.com and run supabase/fix_admin_access.sql in the Supabase SQL editor if needed."
            : "";
        setMessage(
          `Treatments did not save: ${insertError.message}.${hint}`,
        );
        await loadAdminData();
        return;
      }
    }

    setMessage("Service saved.");
    await loadAdminData();
  }

  async function addService() {
    if (!supabase) return;

    const { error } = await supabase.from("services").insert({
      name: "New service",
      category: "Treatment category",
      description: "Describe the treatment.",
      duration_minutes: 45,
      price_label: "Bespoke",
      active: true,
      sort_order: services.length + 1,
    });

    setMessage(error ? error.message : "Service created.");
    await loadAdminData();
  }

  async function toggleService(service: ServiceWithTreatments) {
    if (!supabase) return;
    await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);
    await loadAdminData();
  }

  async function deleteService(service: ServiceWithTreatments) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `Delete ${service.name}? This removes the service and its treatments from future bookings.`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service.id);

    setMessage(error ? error.message : "Service deleted.");
    await loadAdminData();
  }

  async function uploadServiceImage(service: ServiceWithTreatments, file: File) {
    if (!supabase) return;

    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${service.id}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from("service-images")
      .upload(path, file, { upsert: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    const { data } = supabase.storage.from("service-images").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("services")
      .update({ image_url: data.publicUrl })
      .eq("id", service.id);

    if (updateError) {
      setMessage(
        `Storage upload succeeded but the photo URL did not save on the service: ${updateError.message}. Sign out and sign in again as ${adminEmail}, or run supabase/fix_admin_access.sql in Supabase.`,
      );
      await loadAdminData();
      return;
    }

    setMessage("Image uploaded and linked to this service.");
    await loadAdminData();
  }

  function updateAvailability(
    index: number,
    field: "opens_at" | "closes_at",
    value: string,
  ) {
    setAvailability((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value || null } : slot,
      ),
    );
  }

  async function toggleAvailability(slot: Availability) {
    if (!supabase) return;
    await supabase
      .from("availability")
      .update({ enabled: !slot.enabled })
      .eq("id", slot.id);
    await loadAdminData();
  }

  async function saveAvailability() {
    if (!supabase) return;
    const { error } = await supabase.from("availability").upsert(availability);
    setMessage(error ? error.message : "Availability saved.");
    await loadAdminData();
  }

  async function saveSettings() {
    if (!supabase) return;
    const { error } = await supabase.from("booking_settings").upsert({
      ...settings,
      id: true,
      booking_mode: "instant",
      notification_email: adminEmail,
      admin_email: adminEmail,
      updated_at: new Date().toISOString(),
    });
    setMessage(error ? error.message : "Booking settings saved.");
    await loadAdminData();
  }

  async function updateBookingStatus(id: string, status: BookingStatus) {
    if (!supabase) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    void notifyBookingByEmail(id, "updated");
    await loadAdminData();
  }

  function openAddBookingModal(preset?: { date: string; timeMinutes: number }) {
    const firstActive = services.find((service) => service.active);
    const step = settings.slot_interval_minutes || 15;
    const dateStr = preset?.date ?? defaultDateForModal;
    let minutes =
      preset?.timeMinutes ?? parseTimeToMinutes("09:30");
    minutes = Math.round(minutes / step) * step;
    minutes = Math.max(0, Math.min(minutes, 24 * 60 - step));
    setAddBookingForm({
      date: dateStr,
      time: formatHourLabel(minutes),
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      serviceId: firstActive?.id ?? "",
      treatmentId:
        firstActive?.treatments.find((treatment) => treatment.active)?.id ??
        firstActive?.treatments[0]?.id ??
        "",
      notes: "",
      status: "confirmed",
    });
    setAddBookingOpen(true);
  }

  async function createCalendarBooking() {
    if (!supabase) return;
    if (
      !addBookingForm.clientName.trim() ||
      !addBookingForm.clientEmail.trim() ||
      !addBookingForm.serviceId
    ) {
      setMessage("Add client name, email, and service.");
      return;
    }
    if (!addBookingForm.time.trim()) {
      setMessage("Choose a time.");
      return;
    }
    const rawTime = addBookingForm.time.trim();
    const timeNorm =
      rawTime.length === 5 ? `${rawTime}:00` : rawTime.length >= 8 ? rawTime : `${rawTime}:00`;
    setAddBookingSaving(true);
    setMessage("");
    const bookingId = crypto.randomUUID();
    const { error } = await supabase.from("bookings").insert({
      id: bookingId,
      client_name: addBookingForm.clientName.trim(),
      client_email: addBookingForm.clientEmail.trim(),
      client_phone: addBookingForm.clientPhone.trim() || null,
      service_id: addBookingForm.serviceId,
      treatment_id: addBookingForm.treatmentId || null,
      requested_date: addBookingForm.date,
      requested_time: timeNorm,
      notes: addBookingForm.notes.trim() || null,
      status: addBookingForm.status,
    });
    setAddBookingSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    void notifyBookingByEmail(bookingId, "created");
    setMessage("Booking added.");
    setAddBookingOpen(false);
    await loadAdminData();
  }

  if (!supabaseReady) {
    return (
      <AdminShell>
        <Panel title="Supabase environment missing">
          <p className="text-[#776b5f]">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
            Vercel, then redeploy.
          </p>
        </Panel>
      </AdminShell>
    );
  }

  if (!user) {
    return (
      <AdminShell>
        <Panel title="Secure admin login">
          <div className="grid gap-4 md:max-w-xl">
            <p className="text-[#776b5f]">
              Enter {adminEmail} to receive a 6-digit access code for the
              scheduling studio.
            </p>
            <AdminInput
              label="Admin email"
              value={loginEmail}
              onChange={setLoginEmail}
            />
            {codeSent ? (
              <AdminInput
                label="Access code"
                value={loginCode}
                onChange={setLoginCode}
              />
            ) : null}
            <button
              onClick={codeSent ? verifyLoginCode : sendLoginCode}
              className="rounded-full bg-[#111820] px-5 py-3 text-sm font-semibold text-[#fffaf2]"
            >
              {codeSent ? "Verify code" : "Send access code"}
            </button>
            {codeSent ? (
              <button
                onClick={sendLoginCode}
                className="text-left text-sm font-semibold text-[#776b5f]"
              >
                Resend code
              </button>
            ) : null}
            {message ? <p className="text-sm text-[#776b5f]">{message}</p> : null}
          </div>
        </Panel>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      action={
        <button
          onClick={signOut}
          className="rounded-full bg-[#111820] px-5 py-3 text-sm font-semibold text-[#fffaf2]"
        >
          Sign out
        </button>
      }
    >
      {message ? (
        <div className="mb-5 rounded-2xl bg-[#f1e6d6] px-5 py-3 text-sm font-semibold text-[#6f5638]">
          {message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 rounded-[1.5rem] bg-[#111820] p-2 text-sm font-semibold text-[#fffaf2] md:grid-cols-4">
        {(["overview", "services", "schedule", "bookings"] as AdminTab[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-3 capitalize transition ${
                activeTab === tab
                  ? "bg-[#fffaf2] text-[#17130f]"
                  : "text-[#e8ddcf] hover:bg-white/10"
              }`}
            >
              {tab}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <Panel title="Loading studio">
          <p className="text-[#776b5f]">Loading your Supabase data...</p>
        </Panel>
      ) : null}

      {!loading && activeTab === "overview" ? (
        <div className="grid gap-6">
          <Panel
            title="Week at a glance"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAddBookingModal()}
                  className="rounded-full bg-[#111820] px-3 py-2 text-xs font-semibold text-[#fffaf2] sm:px-4 sm:text-sm"
                >
                  Add booking
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarWeekOffset((previous) => previous - 1)}
                  className="rounded-full border border-[#dfcfb9] px-3 py-2 text-xs font-semibold text-[#6f5638] sm:px-4 sm:text-sm"
                >
                  Previous week
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarWeekOffset(0)}
                  className="rounded-full border border-[#dfcfb9] px-3 py-2 text-xs font-semibold text-[#6f5638] sm:px-4 sm:text-sm"
                >
                  This week
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarWeekOffset((previous) => previous + 1)}
                  className="rounded-full border border-[#dfcfb9] px-3 py-2 text-xs font-semibold text-[#6f5638] sm:px-4 sm:text-sm"
                >
                  Next week
                </button>
              </div>
            }
          >
            <p className="mb-2 text-sm font-semibold text-[#776b5f]">
              {formatWeekRangeLabel(weekDates)}
            </p>
            <p className="mb-4 text-sm text-[#776b5f]">
              Blocks use each service duration. Status colours: confirmed, pending,
              completed, cancelled. Click an empty area in a day column to add a
              booking at that time.
            </p>
            {bookingsThisWeek.length === 0 ? (
              <p className="mb-4 rounded-2xl bg-[#f1e6d6] px-4 py-3 text-sm font-medium text-[#6f5638]">
                No bookings scheduled for this week.
              </p>
            ) : null}
            <WeeklyCalendarGrid
              weekDates={weekDates}
              availability={availability}
              bookings={bookingsThisWeek}
              services={services}
              slotIntervalMinutes={settings.slot_interval_minutes}
              onDaySlotClick={(date, timeMinutes) =>
                openAddBookingModal({ date, timeMinutes })
              }
            />
          </Panel>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-5 sm:grid-cols-2">
              <MetricCard label="Active services" value={activeServices} />
              <MetricCard label="Pending requests" value={pendingBookings} />
              <MetricCard label="Open days" value={availability.filter((slot) => slot.enabled).length} />
              <MetricCard label="Booking mode" value="Instant" />
            </div>
            <Panel title="Next steps">
              <p className="mb-4 text-sm leading-relaxed text-[#776b5f]">
                <span className="font-semibold text-[#5c4f42]">Already live: </span>
                public booking to Supabase, admin login (OTP), editable services and
                per-treatment time/price, images, weekly hours, bookings list, weekly
                calendar with add/hover details, marketing homepage from Supabase, and
                booking emails via Resend once you add the env vars below.
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                When you can — booking email &amp; production (don’t forget)
              </p>
              <ul className="mb-5 grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-[#4e463d] marker:text-[#9b7a45]">
                <li className="pl-1">
                  In{" "}
                  <strong className="font-semibold text-[#2a211b]">Resend</strong>:
                  verify your clinic domain and create a sending identity you’re happy
                  with (replace test sender{" "}
                  <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">
                    onboarding@resend.dev
                  </code>
                  ).
                </li>
                <li className="pl-1">
                  In{" "}
                  <strong className="font-semibold text-[#2a211b]">Vercel</strong>{" "}
                  (or your host) environment variables: add{" "}
                  <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">
                    RESEND_API_KEY
                  </code>
                  ,{" "}
                  <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">
                    SUPABASE_SERVICE_ROLE_KEY
                  </code>{" "}
                  (server-only), and{" "}
                  <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">
                    BOOKING_EMAIL_FROM
                  </code>{" "}
                  using your verified sender (see{" "}
                  <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">
                    .env.example
                  </code>
                  ). Redeploy after saving.
                </li>
                <li className="pl-1">
                  Optional: set{" "}
                  <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">
                    BOOKING_ADMIN_EMAIL
                  </code>{" "}
                  if clinic notifications should go somewhere other than the default.
                </li>
                <li className="pl-1">
                  Optional later: Supabase{" "}
                  <strong className="font-semibold text-[#2a211b]">
                    Database Webhook
                  </strong>{" "}
                  on <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">bookings</code>{" "}
                  → <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">POST /api/booking-notify</code>{" "}
                  with{" "}
                  <code className="rounded bg-[#f1e6d6] px-1 py-0.5 text-xs">
                    BOOKING_NOTIFY_WEBHOOK_SECRET
                  </code>{" "}
                  — only if bookings might be created outside this website.
                </li>
              </ul>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                Later ideas (optional)
              </p>
              <ul className="grid gap-3">
                {[
                  "ICS download or Google Calendar sync for appointments.",
                  "Deposits or card capture (e.g. Stripe) once you are happy with live bookings.",
                ].map((step) => (
                  <li
                    key={step}
                    className="rounded-2xl bg-[#f1e6d6] px-4 py-3 text-sm font-medium text-[#4e463d]"
                  >
                    {step}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}

      {!loading && activeTab === "services" ? (
        <Panel
          title="Editable services"
          action={
            <button
              onClick={addService}
              className="rounded-full bg-[#111820] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
            >
              Add service
            </button>
          }
        >
          <div className="grid gap-5">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-[1.6rem] border border-[#dfcfb9] bg-[#fffaf2]/80 p-4"
              >
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b7a45]">
                      {service.category}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">
                      {service.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleService(service)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        service.active
                          ? "bg-[#111820] text-[#fffaf2]"
                          : "bg-[#f1e6d6] text-[#6f5638]"
                      }`}
                    >
                      {service.active ? "Active" : "Hidden"}
                    </button>
                    <button
                      onClick={() => deleteService(service)}
                      className="rounded-full border border-[#d9c8ac] px-4 py-2 text-sm font-semibold text-[#8a3f35]"
                    >
                      Delete service
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <AdminInput
                    label="Service name"
                    value={service.name}
                    onChange={(value) => updateService(service.id, "name", value)}
                  />
                  <AdminInput
                    label="Category"
                    value={service.category}
                    onChange={(value) =>
                      updateService(service.id, "category", value)
                    }
                  />
                  <AdminInput
                    label="Duration"
                    type="number"
                    value={String(service.duration_minutes)}
                    onChange={(value) =>
                      updateService(service.id, "duration_minutes", value)
                    }
                  />
                  <AdminInput
                    label="Price"
                    value={service.price_label ?? ""}
                    onChange={(value) =>
                      updateService(service.id, "price_label", value)
                    }
                  />
                </div>
                <div className="mt-4 grid gap-4 rounded-2xl border border-[#dfcfb9]/90 bg-[#fffaf2]/60 p-4 md:grid-cols-[1fr_auto] md:items-start md:gap-6">
                  <div className="grid gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                      Website tile photo
                    </p>
                    <p className="text-sm text-[#776b5f]">
                      This exact image appears on the public homepage for this service
                      only. Without it, the tile shows a neutral placeholder (not another
                      treatment&apos;s photo).
                    </p>
                    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadServiceImage(service, file);
                        }}
                        className="text-sm normal-case tracking-normal text-[#776b5f]"
                      />
                    </label>
                  </div>
                  <div className="relative mx-auto aspect-[4/3] w-full max-w-[260px] overflow-hidden rounded-2xl border border-[#dfcfb9] bg-[#e8dcc8] shadow-inner shadow-[#8b765d]/10">
                    {service.image_url ? (
                      <Image
                        src={service.image_url}
                        alt=""
                        fill
                        sizes="260px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 px-4 text-center">
                        <p className="text-sm font-semibold text-[#6f5638]">
                          No photo yet
                        </p>
                        <p className="text-xs text-[#776b5f]">
                          Upload to show this service on the website
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <AdminTextarea
                    label="Description"
                    value={service.description ?? ""}
                    onChange={(value) =>
                      updateService(service.id, "description", value)
                    }
                  />
                </div>
                <div className="mt-3 grid gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                      Treatments / areas
                    </p>
                    <p className="mt-1 text-sm text-[#776b5f]">
                      Add one row per treatment or body area. Optional minutes and
                      price override the service defaults for booking length and
                      labels.
                    </p>
                  </div>
                  {service.treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="grid gap-3 rounded-2xl border border-[#dfcfb9]/90 bg-[#f6f0e7]/40 p-4 md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"
                    >
                      <AdminInput
                        label="Name"
                        value={treatment.name}
                        onChange={(value) =>
                          updateTreatmentRow(service.id, treatment.id, "name", value)
                        }
                      />
                      <AdminInput
                        label="Minutes (optional)"
                        type="number"
                        value={
                          treatment.duration_minutes != null
                            ? String(treatment.duration_minutes)
                            : ""
                        }
                        onChange={(value) =>
                          updateTreatmentRow(
                            service.id,
                            treatment.id,
                            "duration_minutes",
                            value,
                          )
                        }
                      />
                      <AdminInput
                        label="Price label (optional)"
                        value={treatment.price_label ?? ""}
                        onChange={(value) =>
                          updateTreatmentRow(
                            service.id,
                            treatment.id,
                            "price_label",
                            value,
                          )
                        }
                      />
                      <div className="flex items-end pb-1">
                        <button
                          type="button"
                          onClick={() =>
                            removeTreatmentRow(service.id, treatment.id)
                          }
                          className="rounded-full border border-[#d9c8ac] px-4 py-2 text-sm font-semibold text-[#8a3f35]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addTreatmentRow(service.id)}
                    className="w-fit rounded-full border border-[#dfcfb9] px-4 py-2 text-sm font-semibold text-[#6f5638]"
                  >
                    Add treatment / area
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void saveService(service)}
                  className="mt-4 rounded-full bg-[#b9945b] px-5 py-3 text-sm font-semibold text-[#17130f]"
                >
                  Save service
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {!loading && activeTab === "schedule" ? (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel
            title="Weekly availability"
            action={
              <button
                onClick={saveAvailability}
                className="rounded-full bg-[#111820] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
              >
                Save hours
              </button>
            }
          >
            <div className="grid gap-3">
              {availability.map((slot, index) => (
                <div
                  key={slot.id}
                  className="grid gap-3 rounded-[1.4rem] bg-[#fffaf2]/80 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <div className="font-semibold">{dayNames[slot.day_of_week]}</div>
                  <AdminInput
                    label="Open"
                    type="time"
                    value={slot.opens_at ?? ""}
                    disabled={!slot.enabled}
                    onChange={(value) =>
                      updateAvailability(index, "opens_at", value)
                    }
                  />
                  <AdminInput
                    label="Close"
                    type="time"
                    value={slot.closes_at ?? ""}
                    disabled={!slot.enabled}
                    onChange={(value) =>
                      updateAvailability(index, "closes_at", value)
                    }
                  />
                  <button
                    onClick={() => toggleAvailability(slot)}
                    className="rounded-full bg-[#111820] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                  >
                    {slot.enabled ? "Open" : "Closed"}
                  </button>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Booking rules"
            action={
              <button
                onClick={saveSettings}
                className="rounded-full bg-[#111820] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
              >
                Save rules
              </button>
            }
          >
            <div className="grid gap-3">
              <AdminInput
                label="Slot interval"
                type="number"
                value={String(settings.slot_interval_minutes)}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    slot_interval_minutes: Number(value),
                  }))
                }
              />
              <AdminInput
                label="Buffer between clients"
                type="number"
                value={String(settings.buffer_minutes)}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    buffer_minutes: Number(value),
                  }))
                }
              />
              <AdminInput
                label="Minimum notice hours"
                type="number"
                value={String(settings.minimum_notice_hours)}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    minimum_notice_hours: Number(value),
                  }))
                }
              />
              <AdminInput
                label="Notification email"
                value={settings.notification_email}
                disabled
              />
            </div>
          </Panel>
        </div>
      ) : null}

      {!loading && activeTab === "bookings" ? (
        <Panel title="Instant bookings">
          <div className="grid gap-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="grid gap-4 rounded-[1.4rem] bg-[#fffaf2]/80 p-4 lg:grid-cols-[1fr_1fr_0.8fr_auto]"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
                    Client
                  </p>
                  <p className="mt-1 font-semibold">{booking.client_name}</p>
                  <p className="text-sm text-[#776b5f]">{booking.client_email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
                    Treatment
                  </p>
                  <p className="mt-1 font-semibold">
                    {serviceLabel(booking, services)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
                    Time
                  </p>
                  <p className="mt-1 font-semibold">
                    {booking.requested_date}, {booking.requested_time}
                  </p>
                </div>
                <select
                  value={booking.status}
                  onChange={(event) =>
                    updateBookingStatus(
                      booking.id,
                      event.target.value as BookingStatus,
                    )
                  }
                  className="rounded-full border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-2 text-sm font-semibold text-[#2a211b]"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {addBookingOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#17130f]/55 p-4 backdrop-blur-[2px]"
          onClick={() => setAddBookingOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-booking-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.6rem] border border-[#dfcfb9] bg-[#fffaf2] p-5 shadow-2xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="add-booking-title"
              className="text-xl font-semibold tracking-[-0.03em]"
            >
              Add booking
            </h3>
            <p className="mt-2 text-sm text-[#776b5f]">
              Creates an appointment in Supabase and refreshes the calendar.
            </p>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminInput
                  label="Date"
                  type="date"
                  value={addBookingForm.date}
                  onChange={(value) =>
                    setAddBookingForm((current) => ({ ...current, date: value }))
                  }
                />
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                  Time
                  <input
                    type="time"
                    step={Math.max(settings.slot_interval_minutes, 5) * 60}
                    value={addBookingForm.time}
                    onChange={(event) =>
                      setAddBookingForm((current) => ({
                        ...current,
                        time: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
                  />
                </label>
              </div>
              <AdminInput
                label="Client name"
                value={addBookingForm.clientName}
                onChange={(value) =>
                  setAddBookingForm((current) => ({ ...current, clientName: value }))
                }
              />
              <AdminInput
                label="Client email"
                type="email"
                value={addBookingForm.clientEmail}
                onChange={(value) =>
                  setAddBookingForm((current) => ({
                    ...current,
                    clientEmail: value,
                  }))
                }
              />
              <AdminInput
                label="Phone (optional)"
                value={addBookingForm.clientPhone}
                onChange={(value) =>
                  setAddBookingForm((current) => ({
                    ...current,
                    clientPhone: value,
                  }))
                }
              />
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                Service
                <select
                  value={addBookingForm.serviceId}
                  onChange={(event) => {
                    const serviceId = event.target.value;
                    const svc = services.find((item) => item.id === serviceId);
                    const nextTreatment =
                      svc?.treatments.find((treatment) => treatment.active)?.id ??
                      svc?.treatments[0]?.id ??
                      "";
                    setAddBookingForm((current) => ({
                      ...current,
                      serviceId,
                      treatmentId: nextTreatment,
                    }));
                  }}
                  className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
                >
                  <option value="">Select service</option>
                  {services
                    .filter((service) => service.active)
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                Treatment (optional)
                <select
                  value={addBookingForm.treatmentId}
                  onChange={(event) =>
                    setAddBookingForm((current) => ({
                      ...current,
                      treatmentId: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
                >
                  <option value="">—</option>
                  {services
                    .find((item) => item.id === addBookingForm.serviceId)
                    ?.treatments.filter((treatment) => treatment.active)
                    .map((treatment) => (
                      <option key={treatment.id} value={treatment.id}>
                        {[
                          treatment.name,
                          treatment.price_label,
                          treatment.duration_minutes != null
                            ? `${treatment.duration_minutes} min`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                Status
                <select
                  value={addBookingForm.status}
                  onChange={(event) =>
                    setAddBookingForm((current) => ({
                      ...current,
                      status: event.target.value as BookingStatus,
                    }))
                  }
                  className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <AdminTextarea
                label="Notes (optional)"
                value={addBookingForm.notes}
                onChange={(value) =>
                  setAddBookingForm((current) => ({ ...current, notes: value }))
                }
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAddBookingOpen(false)}
                className="rounded-full border border-[#dfcfb9] px-5 py-3 text-sm font-semibold text-[#6f5638]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addBookingSaving}
                onClick={() => void createCalendarBooking()}
                className="rounded-full bg-[#111820] px-5 py-3 text-sm font-semibold text-[#fffaf2] disabled:opacity-50"
              >
                {addBookingSaving ? "Saving…" : "Save booking"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function startOfMonday(reference: Date): Date {
  const day = new Date(reference);
  day.setHours(0, 0, 0, 0);
  const weekday = day.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + offset);
  return day;
}

function toISODateLocal(day: Date): string {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function parseTimeToMinutes(value: string): number {
  const segment = value.slice(0, 5);
  const [hours, minutes] = segment.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function formatHourLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatWeekRangeLabel(weekDates: Date[]): string {
  const first = weekDates[0];
  const last = weekDates[6];
  if (first.getFullYear() !== last.getFullYear()) {
    return `${first.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${last.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return `${first.getDate()} ${first.toLocaleDateString("en-GB", { month: "short" })} – ${last.getDate()} ${last.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
}

function weekGridBounds(
  weekDates: Date[],
  availability: Availability[],
): { start: number; end: number } {
  let minOpen = 24 * 60;
  let maxClose = 0;
  let found = false;
  for (const date of weekDates) {
    const dow = (date.getDay() + 6) % 7;
    const slot = availability.find(
      (item) => item.day_of_week === dow && item.enabled,
    );
    if (!slot?.opens_at || !slot?.closes_at) continue;
    found = true;
    minOpen = Math.min(minOpen, parseTimeToMinutes(slot.opens_at));
    maxClose = Math.max(maxClose, parseTimeToMinutes(slot.closes_at));
  }
  if (!found || minOpen >= maxClose) {
    return { start: 9 * 60, end: 18 * 60 };
  }
  return { start: minOpen, end: maxClose };
}

function bookingStatusClasses(status: BookingStatus): string {
  switch (status) {
    case "confirmed":
      return "border-[#111820] bg-[#111820] text-[#fffaf2]";
    case "pending":
      return "border-amber-400 bg-amber-50 text-amber-950";
    case "completed":
      return "border-emerald-400 bg-emerald-50 text-emerald-950";
    case "cancelled":
      return "border-neutral-300 bg-neutral-100 text-neutral-500 line-through opacity-80";
    default:
      return "border-[#dfcfb9] bg-[#f6f0e7] text-[#2a211b]";
  }
}

function bookingBlockDurationMinutes(
  booking: Booking,
  services: ServiceWithTreatments[],
): number {
  const service = services.find((item) => item.id === booking.service_id);
  if (!service) return 45;
  const treatment = service.treatments.find(
    (item) => item.id === booking.treatment_id,
  );
  return (
    treatment?.duration_minutes ?? service.duration_minutes ?? 45
  );
}

function BookingHoverCard({
  booking,
  services,
}: {
  booking: Booking;
  services: ServiceWithTreatments[];
}) {
  const duration = bookingBlockDurationMinutes(booking, services);
  const label = serviceLabel(booking, services);
  const startM = parseTimeToMinutes(booking.requested_time);
  const endM = startM + duration;
  const created = booking.created_at
    ? new Date(booking.created_at).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="rounded-2xl border border-[#dfcfb9] bg-[#fffaf2] p-3 text-xs shadow-2xl ring-1 ring-[#8b765d]/15 sm:text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
        Booking details
      </p>
      <p className="mt-2 text-lg font-semibold leading-snug text-[#2a211b]">
        {booking.client_name}
      </p>
      <div className="mt-3 grid gap-2 text-[#2a211b]">
        <p>
          <span className="text-[#9b7a45]">Email </span>
          {booking.client_email}
        </p>
        {booking.client_phone ? (
          <p>
            <span className="text-[#9b7a45]">Phone </span>
            {booking.client_phone}
          </p>
        ) : null}
        <p>
          <span className="text-[#9b7a45]">Treatment </span>
          {label}
        </p>
        <p>
          <span className="text-[#9b7a45]">When </span>
          {booking.requested_date}{" "}
          {formatHourLabel(startM)}–{formatHourLabel(endM)} ({duration} min)
        </p>
        <p>
          <span className="text-[#9b7a45]">Status </span>
          <span className="capitalize">{booking.status}</span>
        </p>
        {booking.notes ? (
          <p className="whitespace-pre-wrap">
            <span className="text-[#9b7a45]">Notes </span>
            {booking.notes}
          </p>
        ) : null}
        <p className="text-xs text-[#776b5f]">Created {created}</p>
      </div>
    </div>
  );
}

function WeeklyCalendarGrid({
  weekDates,
  availability,
  bookings,
  services,
  slotIntervalMinutes,
  onDaySlotClick,
}: {
  weekDates: Date[];
  availability: Availability[];
  bookings: Booking[];
  services: ServiceWithTreatments[];
  slotIntervalMinutes: number;
  onDaySlotClick?: (date: string, timeMinutes: number) => void;
}) {
  const layout = useMemo(() => {
    const bounds = weekGridBounds(weekDates, availability);
    const displayStart = Math.floor(bounds.start / 60) * 60;
    const displayEnd = Math.ceil(bounds.end / 60) * 60;
    const totalMinutes = Math.max(displayEnd - displayStart, 120);
    const hourPx = 52;
    const pxPerMinute = hourPx / 60;
    const totalHeight = Math.max(totalMinutes * pxPerMinute, 320);
    const hourTicks: number[] = [];
    for (let marker = displayStart; marker < displayEnd; marker += 60) {
      hourTicks.push(marker);
    }
    if (hourTicks.length === 0) {
      hourTicks.push(displayStart);
    }
    return {
      displayStart,
      displayEnd,
      pxPerMinute,
      totalHeight,
      hourTicks,
    };
  }, [weekDates, availability]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const date of weekDates) {
      map.set(toISODateLocal(date), []);
    }
    for (const booking of bookings) {
      const list = map.get(booking.requested_date);
      if (list) list.push(booking);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          parseTimeToMinutes(a.requested_time) -
          parseTimeToMinutes(b.requested_time),
      );
    }
    return map;
  }, [bookings, weekDates]);

  const shortLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayKey = toISODateLocal(new Date());

  return (
    <>
    <div className="overflow-x-auto overflow-y-visible rounded-2xl border border-[#dfcfb9] bg-[#fffaf2]/40">
      <div className="min-w-[720px]">
        <div className="flex border-b border-[#dfcfb9] bg-[#fffaf2]">
          <div className="sticky left-0 z-30 w-12 shrink-0 border-r border-[#dfcfb9] bg-[#f6f0e7] sm:w-14" />
          {weekDates.map((dayDate, index) => {
            const key = toISODateLocal(dayDate);
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`flex min-w-0 flex-1 border-l border-[#dfcfb9]/40 px-1 py-3 text-center first:border-l-0 sm:px-2 ${isToday ? "bg-[#f1e6d6]" : ""}`}
              >
                <div className="w-full">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9b7a45] sm:text-xs">
                    {shortLabels[index]}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-[#2a211b] sm:text-base">
                    {dayDate.getDate()}{" "}
                    {dayDate.toLocaleString("en-GB", { month: "short" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex">
          <div className="sticky left-0 z-20 w-12 shrink-0 border-r border-[#dfcfb9] bg-[#f6f0e7]/95 backdrop-blur-sm sm:w-14">
            {layout.hourTicks.map((marker, index) => (
              <div
                key={marker}
                className={`flex items-start justify-end pr-2 pt-0 text-[10px] font-semibold tabular-nums text-[#9b7a45] sm:text-xs ${index > 0 ? "border-t border-[#e8dcc8]" : ""}`}
                style={{ height: 60 * layout.pxPerMinute }}
              >
                {formatHourLabel(marker)}
              </div>
            ))}
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-7 gap-px bg-[#dfcfb9]/60">
            {weekDates.map((dayDate, dayColumnIndex) => {
              const key = toISODateLocal(dayDate);
              const isToday = key === todayKey;
              const dayBookings = bookingsByDay.get(key) ?? [];
              const pinTooltipLeft = dayColumnIndex >= 5;
              return (
                <div
                  key={key}
                  onClick={(event) => {
                    if (!onDaySlotClick) return;
                    if (
                      (event.target as HTMLElement).closest("[data-booking-block]")
                    ) {
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    const y = event.clientY - rect.top;
                    let minutes =
                      layout.displayStart + y / layout.pxPerMinute;
                    const step = Math.max(slotIntervalMinutes, 5);
                    minutes = Math.round(minutes / step) * step;
                    const maxStart = layout.displayEnd - step;
                    minutes = Math.max(
                      layout.displayStart,
                      Math.min(minutes, maxStart),
                    );
                    onDaySlotClick(key, minutes);
                  }}
                  className={`relative min-w-0 overflow-visible bg-[#fffaf2]/90 ${isToday ? "ring-2 ring-[#b9945b]/35 ring-inset" : ""} ${onDaySlotClick ? "cursor-pointer" : ""}`}
                  style={{
                    minHeight: layout.totalHeight,
                    height: layout.totalHeight,
                  }}
                >
                  {layout.hourTicks.map((marker, index) => (
                    <div
                      key={marker}
                      className={`pointer-events-none absolute left-0 right-0 ${index > 0 ? "border-t border-[#e8dcc8]/90" : ""}`}
                      style={{
                        top: (marker - layout.displayStart) * layout.pxPerMinute,
                      }}
                    />
                  ))}
                  {dayBookings.map((booking) => {
                    const startM = parseTimeToMinutes(booking.requested_time);
                    const duration = bookingBlockDurationMinutes(
                      booking,
                      services,
                    );
                    const topRaw =
                      (startM - layout.displayStart) * layout.pxPerMinute;
                    const top = Math.max(0, topRaw);
                    const rawHeight = duration * layout.pxPerMinute;
                    const maxHeight = layout.totalHeight - top;
                    const height = Math.min(
                      Math.max(rawHeight, 40),
                      Math.max(maxHeight, 0),
                    );
                    const label = serviceLabel(booking, services);
                    return (
                      <div
                        key={booking.id}
                        data-booking-block
                        className="group absolute left-0.5 right-0.5 z-[6] hover:z-[35] sm:left-1 sm:right-1"
                        style={{ top, height }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div
                          className={`relative z-[1] flex h-full flex-col overflow-hidden rounded-lg border px-1 py-0.5 text-[10px] shadow-sm sm:px-2 sm:py-1 sm:text-xs ${bookingStatusClasses(booking.status)}`}
                        >
                          <p className="truncate font-semibold leading-tight">
                            {formatHourLabel(startM)}
                          </p>
                          <p className="truncate leading-tight">
                            {booking.client_name}
                          </p>
                          <p className="hidden truncate text-[10px] leading-tight opacity-90 sm:block">
                            {label}
                          </p>
                        </div>
                        <div
                          className={`pointer-events-none invisible absolute top-0 z-[100] w-[min(18rem,calc(100vw-3rem))] opacity-0 shadow-2xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${pinTooltipLeft ? "right-full mr-1" : "left-full ml-1"}`}
                        >
                          <BookingHoverCard
                            booking={booking}
                            services={services}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function serviceLabel(booking: Booking, services: ServiceWithTreatments[]) {
  const service = services.find((item) => item.id === booking.service_id);
  const treatment = service?.treatments.find(
    (item) => item.id === booking.treatment_id,
  );
  const main = [service?.name, treatment?.name]
    .filter(Boolean)
    .join(" - ");
  if (!main) return "Booking";
  return treatment?.price_label
    ? `${main} (${treatment.price_label})`
    : main;
}

function AdminShell({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f6f0e7] text-[#2a211b]">
      <section className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/70 p-5 shadow-xl shadow-[#8b765d]/10 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
              Admin portal
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
              L&apos;Beau scheduling studio
            </h1>
            <p className="mt-3 max-w-2xl text-[#776b5f]">
              Manage services, images, instant bookings, and working hours from
              Supabase.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-full border border-[#dfcfb9] px-5 py-3 text-center text-sm font-semibold text-[#6f5638]"
            >
              View website
            </Link>
            {action}
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[2rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/70 p-6 shadow-xl shadow-[#8b765d]/10 backdrop-blur-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9b7a45]">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/65 p-5 shadow-xl shadow-[#8b765d]/10 backdrop-blur-xl md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AdminInput({
  label,
  value,
  type = "text",
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b] disabled:opacity-45"
      />
    </label>
  );
}

function AdminTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b]"
      />
    </label>
  );
}
