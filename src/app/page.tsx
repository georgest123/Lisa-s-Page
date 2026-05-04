import Image from "next/image";
import skinRenewalImage from "../../skin-renewal.jpg";

const services = [
  {
    eyebrow: "Cryo 21",
    title: "Lipolysis Fat Freezing",
    visual: "cryo",
    description:
      "Targeted cold therapy for lifting, sculpting, firming, and non-invasive fat reduction.",
    price: "Lift + freeze",
    details: [
      "Full face lift",
      "Neck lift",
      "Jawline sculpting",
      "Lifting and firming",
      "Fat freezing",
      "Cellulite fat freezing",
    ],
  },
  {
    eyebrow: "Touch Skin 21",
    title: "Skin Renewal",
    visual: "touch",
    description:
      "Advanced skin-focused treatments for lifting, texture, scarring, pigmentation, and delicate eye areas.",
    price: "Repair + refine",
    details: [
      "Eyelid lift",
      "Eye bag removal",
      "Face and neck lift",
      "Acne",
      "Scars and post-operation marks",
      "Stretch marks",
      "Lines and wrinkles",
      "Smokers lines",
      "Skin tags",
      "Age and sun spots",
    ],
  },
  {
    eyebrow: "Face 21",
    title: "Thermal Energy Sculpt",
    visual: "face",
    description:
      "Thermal energy, micro current, and pH21 care to lift, firm, tone, sculpt, and volumise.",
    price: "Tone + volumise",
    details: [
      "Thermal energy",
      "Micro current",
      "pH21 treatment care",
      "Lift",
      "Firm",
      "Tone",
      "Sculpt",
      "Volumise",
    ],
  },
];

const benefits = [
  "20+ years of beauty and holistic wellness expertise",
  "Private clinic in Woughton on the Green, Milton Keynes",
  "Non-surgical, low-downtime treatments tailored to you",
  "Free on-site parking and a warm, discreet experience",
];

const journey = [
  "Consultation",
  "Personal plan",
  "Treatment course",
  "Maintenance glow",
];

const team = [
  "Lisa, founder and principal therapist",
  "Natalia, physiotherapist",
  "Debora, luxury nail, brow and lash expert",
  "Janis, beauty and personal care specialist",
];

function TreatmentVisual({ visual }: { visual: string }) {
  if (visual === "cryo") {
    return (
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute left-9 top-8 h-36 w-28 rounded-full border border-[#fffaf2]/75 shadow-[0_0_34px_rgba(255,250,242,0.34)]" />
        <div className="absolute left-16 top-16 h-20 w-20 rounded-full border border-[#d8b66f]/70" />
        <div className="absolute bottom-20 right-10 h-28 w-28 rounded-full bg-[#111820]/20 blur-sm" />
        <div className="absolute bottom-16 right-14 h-28 w-px rotate-[24deg] bg-[#fffaf2]/80 shadow-[0_0_24px_8px_rgba(255,250,242,0.24)]" />
        <div className="absolute bottom-20 right-24 h-24 w-px rotate-[42deg] bg-[#fffaf2]/55" />
        <div className="absolute right-8 top-10 h-16 w-16 rounded-full border border-[#111820]/25" />
      </div>
    );
  }

  if (visual === "touch") {
    return (
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute left-8 top-9 h-24 w-40 rounded-full bg-[#fffaf2]/30 blur-md" />
        <div className="absolute left-10 top-14 h-20 w-40 rounded-[999px] border border-[#fffaf2]/70" />
        <div className="absolute left-16 top-20 h-12 w-28 rounded-[999px] border border-[#d8b66f]/70" />
        <div className="absolute bottom-24 right-10 h-28 w-28 rounded-full border border-[#fffaf2]/70 shadow-[0_0_30px_rgba(255,250,242,0.3)]" />
        <div className="absolute bottom-14 right-16 h-32 w-px -rotate-12 bg-[#fffaf2]/70" />
        <div className="absolute bottom-16 right-28 h-16 w-px rotate-12 bg-[#111820]/30" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute left-10 top-8 h-40 w-28 rounded-[55%_45%_48%_52%] border border-[#fffaf2]/75 shadow-[0_0_35px_rgba(255,250,242,0.32)]" />
      <div className="absolute left-20 top-20 h-14 w-12 rounded-full border border-[#d8b66f]/70" />
      <div className="absolute bottom-14 right-10 h-36 w-36 rounded-full border border-[#111820]/25" />
      <div className="absolute bottom-24 right-14 h-20 w-20 rounded-full border border-[#fffaf2]/70" />
      <div className="absolute bottom-16 right-28 h-28 w-px rotate-[32deg] bg-[#fffaf2]/75 shadow-[0_0_24px_8px_rgba(255,250,242,0.22)]" />
      <div className="absolute bottom-20 right-20 h-28 w-px rotate-[52deg] bg-[#d8b66f]/70" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f0e7] text-[#2a211b]">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="#" className="text-xl font-semibold tracking-[0.28em] text-[#6f5638]">
          L&apos;BEAU
        </a>
        <div className="hidden items-center gap-8 text-sm font-medium text-[#776b5f] md:flex">
          <a href="#treatments">Treatments</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <a
          href="tel:+4407717096809"
          className="rounded-full bg-[#111820] px-5 py-3 text-sm font-semibold text-[#fffaf2] shadow-lg shadow-[#b9945b]/20 transition hover:bg-[#3a3029]"
        >
          Book now
        </a>
      </nav>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-6 pb-24 pt-10 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:pt-20">
        <div className="absolute left-1/2 top-4 -z-0 h-80 w-80 rounded-full bg-[#d6b06f]/25 blur-3xl" />
        <div className="relative z-10">
          <p className="mb-5 inline-flex rounded-full border border-[#dfcfb9] bg-[#fffaf2]/75 px-4 py-2 text-sm font-medium text-[#806847]">
            Aesthetic beauty and body sculpting in Milton Keynes
          </p>
          <h1 className="max-w-4xl text-6xl font-semibold leading-[0.92] tracking-[-0.06em] text-[#211a16] md:text-8xl">
            Sculpt, strengthen and glow with modern non-invasive care.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#776b5f]">
            L&apos;Beau Clinique blends Cryo 21 body sculpting, Touch Skin
            21 renewal, and Face 21 lifting treatments in a serene private
            clinic led by Lisa and her expert team.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="mailto:lbeauclinique@gmail.com?subject=Book%20a%20consultation"
              className="rounded-full bg-[#b9945b] px-8 py-4 text-center font-semibold text-[#17130f] shadow-xl shadow-[#b9945b]/30 transition hover:-translate-y-0.5 hover:bg-[#d0ae72]"
            >
              Book consultation
            </a>
            <a
              href="#treatments"
              className="rounded-full border border-[#d9c8ac] bg-[#fffaf2]/70 px-8 py-4 text-center font-semibold text-[#6f5638] transition hover:-translate-y-0.5 hover:bg-[#fffaf2]"
            >
              Explore treatments
            </a>
          </div>
        </div>

        <div className="relative z-10">
          <div className="relative mx-auto aspect-[4/5] max-w-lg overflow-hidden rounded-[3rem] bg-[#d9c7ae] p-4 shadow-2xl shadow-[#8b765d]/20">
            <Image
              src="/lisa-hero.jpg"
              alt="Lisa at L'Beau Clinique"
              fill
              priority
              sizes="(min-width: 1024px) 42vw, 90vw"
              className="object-cover object-[50%_38%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,32,0.03),rgba(17,24,32,0.12)),radial-gradient(circle_at_78%_22%,rgba(216,182,111,0.28),transparent_24%)]" />
            <div className="absolute inset-4 rounded-[2.35rem] border border-[#fffaf2]/55" />
            <div className="absolute right-8 top-8 rounded-full bg-[#fffaf2]/85 px-5 py-3 text-sm font-semibold text-[#6f5638] shadow-lg shadow-[#111820]/10">
              Cryo 21 + Face 21
            </div>
            <div className="absolute inset-x-8 bottom-8 rounded-[2rem] bg-[#111820]/88 p-6 text-[#fffaf2] shadow-2xl backdrop-blur-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-[#d8b66f]">
                Signature result
              </p>
              <p className="mt-3 text-3xl font-semibold">
                Bespoke plans for body confidence and radiant skin.
              </p>
            </div>
          </div>
          <div className="absolute -bottom-8 -left-6 rounded-[2rem] bg-[#fffaf2] p-5 shadow-xl shadow-[#8b765d]/15">
            <p className="text-4xl font-semibold">20+</p>
            <p className="mt-1 text-sm text-[#776b5f]">years experience</p>
          </div>
        </div>
      </section>

      <section
        id="treatments"
        className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8"
      >
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
              Treatments
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Advanced technology, soft-touch care.
            </h2>
          </div>
          <p className="max-w-md text-[#776b5f]">
            Every course is personalised during consultation to match your body,
            skin, schedule, and goals.
          </p>
        </div>
        <div className="grid gap-7 lg:grid-cols-3">
          {services.map((service, index) => (
            <details
              key={service.title}
              className="group overflow-hidden rounded-[2.4rem] border border-[#dfcfb9] bg-[#fffaf2]/75 shadow-sm transition open:bg-[#fffaf2] open:shadow-2xl open:shadow-[#8b765d]/12"
              open={index === 0}
            >
              <summary className="cursor-pointer list-none p-5 marker:hidden md:p-6">
                <div className="relative mb-6 h-80 overflow-hidden rounded-[2rem] bg-[#d9c7ae] md:h-96 lg:h-[28rem]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(255,250,242,0.92),transparent_24%),radial-gradient(circle_at_76%_18%,rgba(231,198,121,0.48),transparent_18%),linear-gradient(145deg,#f8f0e5,#d8c5a9_48%,#5c5045)]" />
                  {service.visual === "cryo" ? (
                    <>
                      <Image
                        src="/lipolysis.png"
                        alt="Lipolysis fat freezing treatment"
                        fill
                        sizes="(min-width: 1024px) 28vw, 90vw"
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,32,0.02),rgba(17,24,32,0.3)),radial-gradient(circle_at_80%_20%,rgba(216,182,111,0.22),transparent_24%)]" />
                    </>
                  ) : service.visual === "touch" ? (
                    <>
                      <Image
                        src={skinRenewalImage}
                        alt="Touch Skin 21 skin renewal treatment"
                        fill
                        sizes="(min-width: 1024px) 28vw, 90vw"
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,32,0.02),rgba(17,24,32,0.3)),radial-gradient(circle_at_80%_20%,rgba(216,182,111,0.22),transparent_24%)]" />
                    </>
                  ) : service.visual === "face" ? (
                    <>
                      <Image
                        src="/termal-energy-sculpt.jpg"
                        alt="Face 21 thermal energy sculpt treatment"
                        fill
                        sizes="(min-width: 1024px) 28vw, 90vw"
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,32,0.02),rgba(17,24,32,0.3)),radial-gradient(circle_at_80%_20%,rgba(216,182,111,0.22),transparent_24%)]" />
                    </>
                  ) : (
                    <TreatmentVisual visual={service.visual} />
                  )}
                  <div className="absolute inset-x-6 bottom-6 flex min-h-28 flex-col justify-center rounded-[1.4rem] bg-[#111820]/82 p-4 text-[#fffaf2] backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d8b66f]">
                      {service.eyebrow}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {service.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-5 px-2 pb-3">
                  <div>
                    <p className="inline-flex rounded-full bg-[#eee0ca] px-4 py-2 text-sm font-semibold text-[#806847]">
                      {service.price}
                    </p>
                    <p className="mt-4 leading-7 text-[#776b5f]">
                      {service.description}
                    </p>
                  </div>
                  <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#b9945b] text-xl text-[#17130f] transition group-open:rotate-45">
                    +
                  </span>
                </div>
              </summary>
              <div className="border-t border-[#dfcfb9] px-7 pb-7 pt-2">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#9b7a45]">
                  Includes
                </p>
                <ul className="grid gap-3 text-sm font-medium text-[#4e463d]">
                  {service.details.map((detail) => (
                    <li
                      key={detail}
                      className="rounded-full bg-[#f1e6d6] px-4 py-3"
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
      >
        <div className="rounded-[2.5rem] bg-[#111820] p-8 text-[#fffaf2] md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d8b66f]">
            Meet Lisa
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            Feeling fantastic starts from within.
          </h2>
          <p className="mt-6 leading-8 text-[#e8ddcf]">
            Founder Lisa created L&apos;Beau Clinique as a peaceful space for
            non-invasive, high-quality treatments that help clients feel
            supported, empowered, and beautifully confident.
          </p>
          <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-[2rem] border border-[#fffaf2]/20 bg-[#d9c7ae]">
            <Image
              src="/clini-21-lisa.jpeg"
              alt="Lisa inside L'Beau Clinique"
              fill
              sizes="(min-width: 1024px) 34vw, 90vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,32,0),rgba(17,24,32,0.18))]" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="rounded-[2rem] border border-[#dfcfb9] bg-[#fffaf2]/65 p-6"
            >
              <div className="mb-6 h-10 w-10 rounded-full bg-[#b9945b] shadow-[0_0_24px_rgba(185,148,91,0.35)]" />
              <p className="text-lg font-semibold leading-7">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8">
        <div className="rounded-[3rem] bg-[#fffaf2] p-6 shadow-2xl shadow-[#8b765d]/10 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
                Cryo21 journey
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                Body sculpting without surgery or downtime.
              </h2>
              <p className="mt-5 leading-8 text-[#776b5f]">
                Controlled cooling targets areas such as the tummy, thighs,
                jawline, arms, back, and cellulite. Results build as the body
                naturally eliminates treated fat cells.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {journey.map((step, index) => (
                <div key={step} className="rounded-[1.6rem] bg-[#f1e6d6] p-6">
                  <span className="text-sm font-semibold text-[#9b7a45]">
                    0{index + 1}
                  </span>
                  <p className="mt-6 text-2xl font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b7a45]">
            The team
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            Calm expertise for every detail.
          </h2>
        </div>
        <div className="grid gap-3">
          {team.map((person) => (
            <div
              key={person}
              className="rounded-full border border-[#dfcfb9] bg-[#fffaf2]/72 px-6 py-4 font-medium text-[#6f5638]"
            >
              {person}
            </div>
          ))}
        </div>
      </section>

      <section
        id="contact"
        className="mx-auto w-full max-w-7xl px-6 pb-12 pt-20 lg:px-8"
      >
        <div className="grid overflow-hidden rounded-[3rem] bg-[#b9945b] text-[#17130f] lg:grid-cols-[1fr_0.85fr]">
          <div className="p-8 md:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#4b3a22]">
              Book your consultation
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Ready for your sculpt, strength and glow plan?
            </h2>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="tel:+4407717096809"
                className="rounded-full bg-[#fffaf2] px-7 py-4 text-center font-semibold text-[#17130f]"
              >
                Call 07717 096809
              </a>
              <a
                href="mailto:lbeauclinique@gmail.com"
                className="rounded-full border border-[#fffaf2]/45 px-7 py-4 text-center font-semibold text-[#17130f]"
              >
                Email the clinic
              </a>
            </div>
          </div>
          <div className="bg-[#111820] p-8 text-[#fffaf2] md:p-12">
            <h3 className="text-2xl font-semibold">Visit L&apos;Beau Clinique</h3>
            <p className="mt-4 leading-7 text-[#e8ddcf]">
              2 Turpyn Court, Woughton on the Green, Milton Keynes MK6 3BW
            </p>
            <dl className="mt-8 grid gap-3 text-sm text-[#e8ddcf]">
              <div className="flex justify-between gap-6">
                <dt>Mon</dt>
                <dd>09:30 - 19:00</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt>Tue-Fri</dt>
                <dd>09:30 - late</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt>Saturday</dt>
                <dd>09:00 - 17:00</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt>Sunday</dt>
                <dd>Closed</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
