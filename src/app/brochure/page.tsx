import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brochure | L'Beau Clinique",
  description:
    "Download the L'Beau Clinique brochure — treatments, booking, and clinic details.",
};

const CLINIC_PHONE_TEL = "+447717096809";
const CLINIC_PHONE_DISPLAY = "07717 096809";

type BrochureMeta = {
  url: string | null;
  fileName: string | null;
};

async function loadBrochureMeta(): Promise<BrochureMeta> {
  unstable_noStore();
  const supabase = createAnonSupabaseClient();
  if (!supabase) return { url: null, fileName: null };

  const { data } = await supabase
    .from("booking_settings")
    .select("brochure_file_url, brochure_file_name")
    .eq("id", true)
    .maybeSingle();

  return {
    url: data?.brochure_file_url ?? null,
    fileName: data?.brochure_file_name ?? null,
  };
}

export default async function BrochurePage() {
  const brochure = await loadBrochureMeta();
  const hasFile = Boolean(brochure.url);

  return (
    <main className="min-h-screen bg-[#f6f0e7] text-[#2a211b]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-5 md:px-8">
        <Link href="/" className="relative h-16 w-40 shrink-0 sm:h-20 sm:w-52">
          <Image
            src="/Logo Design Template - Rose Gold.png"
            alt="L'Beau Clinique"
            fill
            sizes="208px"
            className="object-contain object-left"
            priority
          />
        </Link>
        <Link
          href="/book"
          className="rounded-full bg-[#111820] px-4 py-2 text-xs font-semibold text-[#fffaf2] sm:text-sm"
        >
          Book now
        </Link>
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 pb-16 md:px-8">
        <div className="rounded-[2.4rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/80 p-8 shadow-2xl shadow-[#8b765d]/10 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
            Clinic brochure
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
            L&apos;Beau Clinique
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-[#776b5f]">
            Download our brochure for treatments, clinic details, and how to
            book. Or book online below.
          </p>

          {hasFile ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="/api/brochure/file"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#b9945b] px-7 py-4 text-center text-sm font-semibold text-[#17130f] shadow-lg shadow-[#b9945b]/25"
              >
                Download brochure
                {brochure.fileName ? ` (${brochure.fileName})` : ""}
              </a>
              <Link
                href="/book"
                className="rounded-full border border-[#d9c8ac] bg-[#fffaf2] px-7 py-4 text-center text-sm font-semibold text-[#6f5638]"
              >
                Book online
              </Link>
              <a
                href={`tel:${CLINIC_PHONE_TEL}`}
                className="rounded-full border border-[#d9c8ac] bg-[#fffaf2] px-7 py-4 text-center text-sm font-semibold text-[#6f5638]"
              >
                Call {CLINIC_PHONE_DISPLAY}
              </a>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl bg-[#f1e6d6] px-5 py-4 text-sm text-[#6f5638]">
              The brochure file is not available yet. Please{" "}
              <Link href="/book" className="font-semibold underline">
                book online
              </Link>{" "}
              or call {CLINIC_PHONE_DISPLAY}.
            </div>
          )}

          <div className="mt-12 grid gap-6 border-t border-[#dfcfb9]/70 pt-10 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b7a45]">
                Share this page
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#776b5f]">
                Scan or download the QR code — it opens this brochure page so
                clients can download the file you uploaded.
              </p>
              <a
                href="/api/brochure/qr?download=1"
                download="lbeau-clinique-brochure-qr.png"
                className="mt-4 inline-flex rounded-full border border-[#d9c8ac] px-5 py-2.5 text-sm font-semibold text-[#6f5638]"
              >
                Download QR code PNG
              </a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/brochure/qr"
              alt="QR code to clinic brochure"
              width={160}
              height={160}
              className="rounded-2xl border border-[#dfcfb9] bg-white p-3"
            />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-[#776b5f]/80">
          <Link href="/" className="underline underline-offset-2">
            Back to website
          </Link>
        </p>
      </section>
    </main>
  );
}
