import Link from "next/link";
import { getStripe } from "@/lib/stripe-server";

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function DepositReturnPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  let bookingId: string | null = null;

  if (sessionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        bookingId =
          session.metadata?.booking_id?.trim() ||
          session.client_reference_id?.trim() ||
          null;
      } catch {
        bookingId = null;
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f0e7] px-5 py-16 text-[#2a211b]">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/85 p-10 shadow-xl shadow-[#8b765d]/10 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
          Payment received
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Thank you — your deposit went through.
        </h1>
        <p className="mt-4 leading-relaxed text-[#776b5f]">
          Your appointment is being confirmed. You should also receive a
          confirmation email with full details. Add the appointment to your
          calendar below.
        </p>

        {bookingId ? (
          <p className="mt-6 text-sm leading-relaxed text-[#5c4f42]">
            <span className="font-semibold text-[#2a211b]">
              Add to your calendar:
            </span>{" "}
            <Link
              href={`/api/bookings/${bookingId}/calendar`}
              className="font-semibold text-[#8b6914] underline underline-offset-2"
            >
              Download .ics
            </Link>
            {" · "}
            <Link
              href={`/api/bookings/${bookingId}/calendar?fmt=google`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#8b6914] underline underline-offset-2"
            >
              Google Calendar
            </Link>
          </p>
        ) : (
          <p className="mt-6 text-sm text-[#776b5f]">
            Calendar links are in your confirmation email if they don&apos;t
            appear here.
          </p>
        )}

        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[#111820] px-7 py-3 text-sm font-semibold text-[#fffaf2]"
        >
          Back to website
        </Link>
      </div>
    </main>
  );
}
