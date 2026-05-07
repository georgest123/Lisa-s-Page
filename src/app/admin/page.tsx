"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
  const [services, setServices] = useState<ServiceWithTreatments[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<BookingSettings>(defaultSettings);
  const [message, setMessage] = useState("");
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

  const activeServices = services.filter((service) => service.active).length;
  const pendingBookings = bookings.filter(
    (booking) => booking.status === "pending",
  ).length;

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
    const treatments = (treatmentsResult.data ?? []) as Treatment[];
    setServices(
      loadedServices.map((service) => ({
        ...service,
        treatments: treatments.filter(
          (treatment) => treatment.service_id === service.id,
        ),
      })),
    );
    setAvailability((availabilityResult.data ?? []) as Availability[]);
    setBookings((bookingsResult.data ?? []) as Booking[]);
    setSettings((settingsResult.data as BookingSettings | null) ?? defaultSettings);
    setLoading(false);
  }

  async function sendLoginLink() {
    if (!supabase) return;
    if (loginEmail.trim().toLowerCase() !== adminEmail) {
      setMessage(`Only ${adminEmail} can access the scheduling studio.`);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    setMessage(error ? error.message : "Check your email for the secure login link.");
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

  function updateTreatments(serviceId: string, value: string) {
    const names = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              treatments: names.map((name, index) => ({
                id: `${serviceId}-${index}`,
                service_id: serviceId,
                name,
                active: true,
                sort_order: index + 1,
                created_at: "",
              })),
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

    await supabase.from("treatments").delete().eq("service_id", service.id);
    if (service.treatments.length > 0) {
      await supabase.from("treatments").insert(
        service.treatments.map((treatment, index) => ({
          service_id: service.id,
          name: treatment.name,
          active: true,
          sort_order: index + 1,
        })),
      );
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
    await supabase
      .from("services")
      .update({ image_url: data.publicUrl })
      .eq("id", service.id);
    setMessage("Image uploaded.");
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
    await supabase.from("bookings").update({ status }).eq("id", id);
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
              Enter {adminEmail} to receive a magic link for the scheduling
              studio.
            </p>
            <AdminInput
              label="Admin email"
              value={loginEmail}
              onChange={setLoginEmail}
            />
            <button
              onClick={sendLoginLink}
              className="rounded-full bg-[#111820] px-5 py-3 text-sm font-semibold text-[#fffaf2]"
            >
              Send login link
            </button>
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
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-5 sm:grid-cols-2">
            <MetricCard label="Active services" value={activeServices} />
            <MetricCard label="Pending requests" value={pendingBookings} />
            <MetricCard label="Open days" value={availability.filter((slot) => slot.enabled).length} />
            <MetricCard label="Booking mode" value="Instant" />
          </div>
          <Panel title="Next integration steps">
            <ul className="grid gap-3">
              {[
                "Public booking page now writes confirmed bookings to Supabase.",
                "Admin can edit services, upload images, and manage hours.",
                "Email notifications still need a provider such as Resend.",
                "Payments/deposits can be added after the booking flow is approved.",
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
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
                    Image
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
                <div className="mt-3">
                  <AdminTextarea
                    label="Description"
                    value={service.description ?? ""}
                    onChange={(value) =>
                      updateService(service.id, "description", value)
                    }
                  />
                </div>
                <div className="mt-3">
                  <AdminTextarea
                    label="Service details / treatments"
                    value={service.treatments
                      .map((treatment) => treatment.name)
                      .join("\n")}
                    onChange={(value) => updateTreatments(service.id, value)}
                  />
                </div>
                <button
                  onClick={() => saveService(service)}
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
    </AdminShell>
  );
}

function serviceLabel(booking: Booking, services: ServiceWithTreatments[]) {
  const service = services.find((item) => item.id === booking.service_id);
  const treatment = service?.treatments.find(
    (item) => item.id === booking.treatment_id,
  );
  return [service?.name, treatment?.name].filter(Boolean).join(" - ") || "Booking";
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
