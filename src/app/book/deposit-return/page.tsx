import Link from "next/link";
import { fulfillStripeDeposit } from "@/lib/fulfill-stripe-deposit";
import { getStripe } from "@/lib/stripe-server";

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function DepositReturnPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  let bookingId: string | null = null;
  let notifyNote =
    "Your appointment is being confirmed. You should receive a confirmation email with full details, and a text message if you shared your mobile number.";

  if (sessionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["payment_intent"],
        });
        bookingId =
          session.metadata?.booking_id?.trim() ||
          session.client_reference_id?.trim() ||
          null;

        // Backup if the Stripe webhook is delayed or missing — confirms the
        // booking and sends the client email/SMS from this success page.
        const result = await fulfillStripeDeposit(session);
        if (!result.ok) {
          console.error("deposit-return fulfill", result.error);
          notifyNote =
            "Your payment went through. If you do not receive a confirmation email within a few minutes, contact the clinic and we will confirm manually.";
        } else if (result.notified) {
          notifyNote =
            "Your appointment is confirmed. A confirmation email is on its way, plus a text if you shared your mobile number.";
        }
      } catch (error) {
        console.error("deposit-return", error);
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
        <p className="mt-4 leading-relaxed text-[#776b5f]">{notifyNote} Add
          the appointment to your calendar below.</p>

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
