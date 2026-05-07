"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type AdminTab = "overview" | "services" | "schedule" | "bookings";
type AppointmentStatus = "Pending" | "Confirmed" | "Completed";

const initialServices = [
  {
    name: "Cryo 21",
    category: "Lipolysis Fat Freezing",
    duration: "45 min",
    price: "From £95",
    active: true,
    treatments: [
      "Full face lift",
      "Neck lift",
      "Jawline sculpting",
      "Fat freezing",
      "Cellulite fat freezing",
    ],
  },
  {
    name: "Touch Skin 21",
    category: "Skin Renewal",
    duration: "60 min",
    price: "Bespoke",
    active: true,
    treatments: [
      "Eyelid lift",
      "Eye bag removal",
      "Acne",
      "Scars / post operation",
      "Lines & wrinkles",
      "Age & sun spots",
    ],
  },
  {
    name: "Face 21",
    category: "Thermal Energy Sculpt",
    duration: "50 min",
    price: "Bespoke",
    active: true,
    treatments: ["Thermal energy", "Micro current", "Lift", "Firm", "Tone"],
  },
];

const initialAvailability = [
  { day: "Monday", open: "09:30", close: "19:00", enabled: true },
  { day: "Tuesday", open: "09:30", close: "18:30", enabled: true },
  { day: "Wednesday", open: "09:30", close: "18:00", enabled: true },
  { day: "Thursday", open: "09:30", close: "18:00", enabled: true },
  { day: "Friday", open: "09:30", close: "20:00", enabled: true },
  { day: "Saturday", open: "09:00", close: "17:00", enabled: true },
  { day: "Sunday", open: "Closed", close: "Closed", enabled: false },
];

const initialBookings: Array<{
  client: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}> = [
  {
    client: "Amelia Hart",
    service: "Cryo 21 - Jawline sculpting",
    date: "14 May",
    time: "10:30",
    status: "Confirmed",
  },
  {
    client: "Sophie Clarke",
    service: "Touch Skin 21 - Eye bag removal",
    date: "14 May",
    time: "13:00",
    status: "Pending",
  },
  {
    client: "Maya Lewis",
    service: "Face 21 - Lift & firm",
    date: "15 May",
    time: "11:15",
    status: "Completed",
  },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [services, setServices] = useState(initialServices);
  const [availability, setAvailability] = useState(initialAvailability);
  const [bookings, setBookings] = useState(initialBookings);

  const activeServices = services.filter((service) => service.active).length;
  const pendingBookings = bookings.filter(
    (booking) => booking.status === "Pending",
  ).length;

  const nextSteps = useMemo(
    () => [
      "Connect services, availability, and bookings to Supabase tables.",
      "Add staff login with Supabase Auth.",
      "Send client and clinic emails when a booking is requested.",
      "Add deposit payments once booking flow is confirmed.",
    ],
    [],
  );

  function updateService(
    index: number,
    field: "name" | "category" | "duration" | "price",
    value: string,
  ) {
    setServices((current) =>
      current.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, [field]: value } : service,
      ),
    );
  }

  function toggleService(index: number) {
    setServices((current) =>
      current.map((service, serviceIndex) =>
        serviceIndex === index
          ? { ...service, active: !service.active }
          : service,
      ),
    );
  }

  function updateAvailability(
    index: number,
    field: "open" | "close",
    value: string,
  ) {
    setAvailability((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    );
  }

  function toggleAvailability(index: number) {
    setAvailability((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, enabled: !slot.enabled } : slot,
      ),
    );
  }

  function updateBookingStatus(index: number, status: AppointmentStatus) {
    setBookings((current) =>
      current.map((booking, bookingIndex) =>
        bookingIndex === index ? { ...booking, status } : booking,
      ),
    );
  }

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
              Manage services, booking requests, working hours, and the future
              Supabase-backed appointment flow from one calm workspace.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-[#111820] px-5 py-3 text-center text-sm font-semibold text-[#fffaf2]"
          >
            View website
          </Link>
        </div>

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

        {activeTab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-5 sm:grid-cols-2">
              <MetricCard label="Active services" value={activeServices} />
              <MetricCard label="Pending requests" value={pendingBookings} />
              <MetricCard label="Open days" value={6} />
              <MetricCard label="Avg. appointment" value="52m" />
            </div>
            <Panel title="Supabase integration plan">
              <ul className="grid gap-3">
                {nextSteps.map((step) => (
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

        {activeTab === "services" ? (
          <Panel title="Editable services">
            <div className="grid gap-5">
              {services.map((service, index) => (
                <div
                  key={service.name}
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
                      onClick={() => toggleService(index)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        service.active
                          ? "bg-[#111820] text-[#fffaf2]"
                          : "bg-[#f1e6d6] text-[#6f5638]"
                      }`}
                    >
                      {service.active ? "Active" : "Hidden"}
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <AdminInput
                      label="Service name"
                      value={service.name}
                      onChange={(value) => updateService(index, "name", value)}
                    />
                    <AdminInput
                      label="Category"
                      value={service.category}
                      onChange={(value) =>
                        updateService(index, "category", value)
                      }
                    />
                    <AdminInput
                      label="Duration"
                      value={service.duration}
                      onChange={(value) =>
                        updateService(index, "duration", value)
                      }
                    />
                    <AdminInput
                      label="Price"
                      value={service.price}
                      onChange={(value) => updateService(index, "price", value)}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {service.treatments.map((treatment) => (
                      <span
                        key={treatment}
                        className="rounded-full bg-[#f1e6d6] px-3 py-2 text-xs font-semibold text-[#6f5638]"
                      >
                        {treatment}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {activeTab === "schedule" ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel title="Weekly availability">
              <div className="grid gap-3">
                {availability.map((slot, index) => (
                  <div
                    key={slot.day}
                    className="grid gap-3 rounded-[1.4rem] bg-[#fffaf2]/80 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <div className="font-semibold">{slot.day}</div>
                    <AdminInput
                      label="Open"
                      value={slot.open}
                      disabled={!slot.enabled}
                      onChange={(value) =>
                        updateAvailability(index, "open", value)
                      }
                    />
                    <AdminInput
                      label="Close"
                      value={slot.close}
                      disabled={!slot.enabled}
                      onChange={(value) =>
                        updateAvailability(index, "close", value)
                      }
                    />
                    <button
                      onClick={() => toggleAvailability(index)}
                      className="rounded-full bg-[#111820] px-4 py-2 text-sm font-semibold text-[#fffaf2]"
                    >
                      {slot.enabled ? "Open" : "Closed"}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Booking rules">
              <div className="grid gap-3">
                <AdminInput label="Slot interval" value="15 minutes" />
                <AdminInput label="Buffer between clients" value="10 minutes" />
                <AdminInput label="Minimum notice" value="24 hours" />
                <AdminInput label="Deposit rule" value="Optional later" />
              </div>
            </Panel>
          </div>
        ) : null}

        {activeTab === "bookings" ? (
          <Panel title="Booking requests">
            <div className="grid gap-3">
              {bookings.map((booking, index) => (
                <div
                  key={`${booking.client}-${booking.time}`}
                  className="grid gap-4 rounded-[1.4rem] bg-[#fffaf2]/80 p-4 lg:grid-cols-[1fr_1fr_0.8fr_auto]"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
                      Client
                    </p>
                    <p className="mt-1 font-semibold">{booking.client}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
                      Treatment
                    </p>
                    <p className="mt-1 font-semibold">{booking.service}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
                      Time
                    </p>
                    <p className="mt-1 font-semibold">
                      {booking.date}, {booking.time}
                    </p>
                  </div>
                  <select
                    value={booking.status}
                    onChange={(event) =>
                      updateBookingStatus(
                        index,
                        event.target.value as AppointmentStatus,
                      )
                    }
                    className="rounded-full border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-2 text-sm font-semibold text-[#2a211b]"
                  >
                    <option>Pending</option>
                    <option>Confirmed</option>
                    <option>Completed</option>
                  </select>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/65 p-5 shadow-xl shadow-[#8b765d]/10 backdrop-blur-xl md:p-6">
      <h2 className="mb-5 text-2xl font-semibold tracking-[-0.03em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AdminInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7a45]">
      {label}
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="rounded-2xl border border-[#dfcfb9] bg-[#f6f0e7] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-[#2a211b] outline-none transition focus:border-[#b9945b] disabled:opacity-45"
      />
    </label>
  );
}
