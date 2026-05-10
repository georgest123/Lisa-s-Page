import Link from "next/link";

export default function DepositReturnPage() {
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
          Your appointment is being confirmed. You will receive a confirmation
          email shortly with full details and calendar links. If anything looks
          wrong, reply to that email or contact the clinic.
        </p>
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
