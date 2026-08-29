import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";
import type { Service, Treatment } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brochure | L'Beau Clinique",
  description:
    "Cryo 21, Touch Skin 21 and Face 21 treatments at L'Beau Clinique, Milton Keynes. Book online or call the clinic.",
};

const CLINIC_PHONE_TEL = "+447717096809";
const CLINIC_PHONE_DISPLAY = "07717 096809";
const CLINIC_EMAIL = "lbeauclinique@gmail.com";
const CLINIC_ADDRESS =
  "2 Turpyn Court, Woughton on the Green, Milton Keynes MK6 3BW";

type BrochureService = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  imageUrl: string | null;
  options: string[];
};

async function loadBrochureServices(): Promise<BrochureService[]> {
  unstable_noStore();
  const supabase = createAnonSupabaseClient();
  if (!supabase) return [];

  const { data: servicesData, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (error || !servicesData?.length) return [];

  const { data: treatmentsData } = await supabase
    .from("treatments")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  const treatments = (treatmentsData ?? []) as Treatment[];

  return (servicesData as Service[]).map((service) => {
    const options = treatments
      .filter((t) => t.service_id === service.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => {
        const parts = [t.name];
        if (t.price_label) parts.push(t.price_label);
        if (t.duration_minutes != null) parts.push(`${t.duration_minutes} min`);
        return parts.join(" · ");
      });

    return {
      id: service.id,
      name: service.name,
      category: service.category,
      description: service.description ?? "",
      price: service.price_label ?? "",
      imageUrl: service.image_url,
      options,
    };
  });
}

export default async function BrochurePage() {
  const services = await loadBrochureServices();

  return (
    <main className="min-h-screen bg-[#f6f0e7] text-[#2a211b]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 md:px-8">
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href="/api/brochure/qr?download=1"
            download="lbeau-clinique-brochure-qr.png"
            className="rounded-full border border-[#d9c8ac] bg-[#fffaf2]/80 px-4 py-2 text-xs font-semibold text-[#6f5638] sm:text-sm"
          >
            Download QR
          </a>
          <Link
            href="/book"
            className="rounded-full bg-[#111820] px-4 py-2 text-xs font-semibold text-[#fffaf2] sm:text-sm"
          >
            Book now
          </Link>
        </div>
      </header>

      <section className="relative mx-auto w-full max-w-5xl overflow-hidden px-5 pb-10 md:px-8">
        <div className="relative grid overflow-hidden rounded-[2.4rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/70 shadow-2xl shadow-[#8b765d]/15 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 md:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
              Digital brochure
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#211a16] md:text-5xl">
              L&apos;Beau Clinique
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-[#776b5f]">
              Modern non-invasive sculpting, skin renewal, and facial lifting in
              a private Milton Keynes clinic.
            </p>
            <ul className="mt-8 grid gap-3 text-sm font-medium text-[#5c4f42]">
              <li>Cryo 21 · Touch Skin 21 · Face 21</li>
              <li>20+ years of beauty &amp; wellness expertise</li>
              <li>Book online or call the clinic</li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/book"
                className="rounded-full bg-[#b9945b] px-6 py-3 text-center text-sm font-semibold text-[#17130f] shadow-lg shadow-[#b9945b]/25"
              >
                Book consultation
              </Link>
              <a
                href={`tel:${CLINIC_PHONE_TEL}`}
                className="rounded-full border border-[#d9c8ac] bg-[#fffaf2]/80 px-6 py-3 text-center text-sm font-semibold text-[#6f5638]"
              >
                Call {CLINIC_PHONE_DISPLAY}
              </a>
            </div>
          </div>
          <div className="relative min-h-[280px] lg:min-h-full">
            <Image
              src="/NewLisa.PNG"
              alt="Lisa at L'Beau Clinique"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover object-[50%_20%]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111820]/35 to-transparent" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-6 md:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
          Treatments
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          Signature care
        </h2>
        <div className="mt-8 grid gap-5">
          {services.length === 0 ? (
            <p className="rounded-2xl bg-[#f1e6d6] px-5 py-4 text-sm text-[#6f5638]">
              Services will appear here once published in the scheduling studio.
            </p>
          ) : (
            services.map((service) => (
              <article
                key={service.id}
                className="overflow-hidden rounded-[1.8rem] border border-[#dfcfb9]/80 bg-[#fffaf2]/75 shadow-lg shadow-[#8b765d]/10"
              >
                <div className="grid md:grid-cols-[0.85fr_1.15fr]">
                  <div className="relative min-h-[200px] bg-[#d9c7ae]">
                    {service.imageUrl ? (
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        sizes="(min-width: 768px) 35vw, 90vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm font-medium text-[#6f5638]">
                        {service.name}
                      </div>
                    )}
                  </div>
                  <div className="p-6 md:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9b7a45]">
                      {service.category}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                      {service.name}
                    </h3>
                    {service.price ? (
                      <p className="mt-2 text-sm font-semibold text-[#806847]">
                        {service.price}
                      </p>
                    ) : null}
                    {service.description ? (
                      <p className="mt-3 text-sm leading-relaxed text-[#776b5f]">
                        {service.description}
                      </p>
                    ) : null}
                    {service.options.length > 0 ? (
                      <div className="mt-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7a45]">
                          Options
                        </p>
                        <ul className="mt-3 grid gap-2 text-sm text-[#4e463d]">
                          {service.options.map((option) => (
                            <li
                              key={option}
                              className="border-b border-[#dfcfb9]/60 pb-2 last:border-0"
                            >
                              {option}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-10 md:px-8">
        <div className="grid gap-6 overflow-hidden rounded-[2rem] border border-[#dfcfb9]/80 bg-[#111820] p-8 text-[#fffaf2] md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d8b66f]">
              Visit &amp; book
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              Ready when you are
            </h2>
            <p className="mt-4 leading-relaxed text-[#e8ddcf]">
              {CLINIC_ADDRESS}
            </p>
            <div className="mt-6 grid gap-2 text-sm text-[#e8ddcf]">
              <a
                href={`tel:${CLINIC_PHONE_TEL}`}
                className="font-semibold text-[#fffaf2] underline underline-offset-2"
              >
                {CLINIC_PHONE_DISPLAY}
              </a>
              <a
                href={`mailto:${CLINIC_EMAIL}`}
                className="font-semibold text-[#fffaf2] underline underline-offset-2"
              >
                {CLINIC_EMAIL}
              </a>
            </div>
            <Link
              href="/book"
              className="mt-8 inline-flex rounded-full bg-[#b9945b] px-6 py-3 text-sm font-semibold text-[#17130f]"
            >
              Book online
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center rounded-[1.6rem] bg-[#fffaf2]/08 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8b66f]">
              Share this brochure
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/brochure/qr"
              alt="QR code linking to this brochure"
              width={180}
              height={180}
              className="mt-4 rounded-2xl bg-white p-3"
            />
            <a
              href="/api/brochure/qr?download=1"
              download="lbeau-clinique-brochure-qr.png"
              className="mt-4 text-sm font-semibold text-[#d8b66f] underline underline-offset-2"
            >
              Download QR code PNG
            </a>
            <p className="mt-3 text-xs leading-relaxed text-[#cfc3b4]">
              Print or share the QR — it opens this brochure page.
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pb-10 text-xs text-[#776b5f]/80 md:px-8">
        <Link href="/" className="font-medium underline underline-offset-2">
          Back to website
        </Link>
        <span>lbeauclinique.com</span>
      </footer>
    </main>
  );
}
