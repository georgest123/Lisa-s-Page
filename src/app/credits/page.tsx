import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About this website | George Staicu",
  description:
    "Features and integrations built for L'Beau Clinique — marketing site, booking, admin scheduling studio, payments, and calendar.",
};

export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-[#f6f0e7] px-6 py-16 text-[#2a211b] md:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
          Built for L&apos;Beau Clinique
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          This website &amp; scheduling studio
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-[#776b5f]">
          I&apos;m{" "}
          <span className="font-semibold text-[#2a211b]">George Staicu</span>.
          Below is what was designed and engineered end-to-end for this clinic
          — a modern public presence plus a full operational backend clients and
          staff use every day.
        </p>

        <section className="mt-14 space-y-10">
          <div>
            <h2 className="text-xl font-semibold text-[#17130f]">
              Marketing &amp; brand experience
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[#5c4f42] marker:text-[#9b7a45]">
              <li>
                Custom Next.js front end with a cohesive beauty-clinic aesthetic,
                responsive layout, and imagery-led service tiles with expandable
                detail.
              </li>
              <li>
                Live content from Supabase — services, treatments, pricing labels,
                durations, and photos managed without redeploying the site.
              </li>
              <li>
                Opening hours on the homepage stay in sync with the admin
                availability editor.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#17130f]">
              Scheduling studio (admin)
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[#5c4f42] marker:text-[#9b7a45]">
              <li>
                Secure login via email OTP (no magic links) for the clinic email.
              </li>
              <li>
                Full CRUD for services and per-treatment areas — names,
                durations, prices, imagery, and ordering.
              </li>
              <li>
                Weekly availability editor with saved hours per weekday.
              </li>
              <li>
                Bookings overview with status workflow, deletion, and a visual
                weekly calendar with hover details and admin-created appointments.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#17130f]">
              Public booking &amp; operations
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[#5c4f42] marker:text-[#9b7a45]">
              <li>
                Instant booking flow with slots that respect treatment length and
                configurable buffer time — no overlapping appointments.
              </li>
              <li>
                Optional Stripe Checkout deposits; booking advances after successful
                payment with webhook-driven confirmation.
              </li>
              <li>
                Transactional emails (client + clinic) via Resend; calendar
                attachments and ICS download / Google Calendar links.
              </li>
              <li>
                Google Calendar API integration so confirmed bookings sync to the
                clinic calendar with status-aware updates.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#17130f]">
              Platform &amp; reliability
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[#5c4f42] marker:text-[#9b7a45]">
              <li>
                Supabase (PostgreSQL, Auth, Row Level Security, optional storage)
                for data integrity and safe admin vs public access.
              </li>
              <li>
                Deployed for continuous delivery — infrastructure-ready for
                production traffic and domain hosting.
              </li>
            </ul>
          </div>
        </section>

        <p className="mt-14 text-sm leading-relaxed text-[#776b5f]">
          Interested in something similar for your business? Reach out via the
          same channels you use to find George — this page is a compact snapshot
          of the depth behind a polished surface.
        </p>

        <Link
          href="/"
          className="mt-10 inline-flex rounded-full border border-[#dfcfb9] bg-[#fffaf2]/80 px-6 py-3 text-sm font-semibold text-[#6f5638] transition hover:border-[#b9945b]"
        >
          Back to L&apos;Beau Clinique
        </Link>
      </div>
    </main>
  );
}
