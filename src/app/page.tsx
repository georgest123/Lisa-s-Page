const services = [
  {
    title: "Cryo21 Sculpt",
    description:
      "Non-invasive fat freezing for stubborn areas, facial contouring, cellulite smoothing, and skin confidence.",
    price: "from £60",
  },
  {
    title: "EMS Training",
    description:
      "A focused 20-minute Electro Muscle Stimulation session to tone, strengthen, and support busy lifestyles.",
    price: "20 min sessions",
  },
  {
    title: "Aesthetics & Wellness",
    description:
      "Results-led aesthetic treatments delivered with a calm, holistic approach to help you glow from within.",
    price: "bespoke plans",
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

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf4ee] text-[#241511]">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="#" className="text-xl font-semibold tracking-[0.28em]">
          L&apos;BEAU
        </a>
        <div className="hidden items-center gap-8 text-sm font-medium text-[#76584f] md:flex">
          <a href="#treatments">Treatments</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <a
          href="tel:+4407717096809"
          className="rounded-full bg-[#241511] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#9c6f61]/20 transition hover:bg-[#5a332c]"
        >
          Book now
        </a>
      </nav>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-6 pb-24 pt-10 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:pt-20">
        <div className="absolute left-1/2 top-4 -z-0 h-80 w-80 rounded-full bg-[#e8bdae]/30 blur-3xl" />
        <div className="relative z-10">
          <p className="mb-5 inline-flex rounded-full border border-[#e2c5bb] bg-white/60 px-4 py-2 text-sm font-medium text-[#8a5b4f]">
            Aesthetic beauty and body sculpting in Milton Keynes
          </p>
          <h1 className="max-w-4xl text-6xl font-semibold leading-[0.92] tracking-[-0.06em] text-[#241511] md:text-8xl">
            Sculpt, strengthen and glow with modern non-invasive care.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#76584f]">
            L&apos;Beau Clinique blends Cryo21 fat freezing, EMS training, and
            aesthetic wellness treatments in a serene private clinic led by Lisa
            and her expert team.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="mailto:lbeauclinique@gmail.com?subject=Book%20a%20consultation"
              className="rounded-full bg-[#9b5f53] px-8 py-4 text-center font-semibold text-white shadow-xl shadow-[#9b5f53]/25 transition hover:-translate-y-0.5 hover:bg-[#7e473e]"
            >
              Book consultation
            </a>
            <a
              href="#treatments"
              className="rounded-full border border-[#d8b7aa] bg-white/60 px-8 py-4 text-center font-semibold text-[#5e3c35] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Explore treatments
            </a>
          </div>
        </div>

        <div className="relative z-10">
          <div className="relative mx-auto aspect-[4/5] max-w-lg overflow-hidden rounded-[3rem] bg-[#d9b1a6] p-5 shadow-2xl shadow-[#9c6f61]/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(145deg,#f6ddd3,#b9897d_48%,#5f3932)]" />
            <div className="relative flex h-full flex-col justify-between rounded-[2.3rem] border border-white/45 bg-white/20 p-8 backdrop-blur-sm">
              <div className="self-end rounded-full bg-white/70 px-5 py-3 text-sm font-semibold text-[#6f473e]">
                Cryo21 + EMS
              </div>
              <div>
                <div className="mb-5 h-44 rounded-full bg-white/30 blur-xl" />
                <div className="rounded-[2rem] bg-[#241511]/85 p-6 text-white shadow-2xl">
                  <p className="text-sm uppercase tracking-[0.3em] text-[#e8c8bd]">
                    Signature result
                  </p>
                  <p className="mt-3 text-3xl font-semibold">
                    Bespoke plans for body confidence and radiant skin.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-8 -left-6 rounded-[2rem] bg-white p-5 shadow-xl shadow-[#9c6f61]/15">
            <p className="text-4xl font-semibold">20+</p>
            <p className="mt-1 text-sm text-[#76584f]">years experience</p>
          </div>
        </div>
      </section>

      <section
        id="treatments"
        className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8"
      >
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b5f53]">
              Treatments
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Advanced technology, soft-touch care.
            </h2>
          </div>
          <p className="max-w-md text-[#76584f]">
            Every course is personalised during consultation to match your body,
            skin, schedule, and goals.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="group rounded-[2rem] border border-[#ead2c8] bg-white/70 p-7 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-[#9c6f61]/10"
            >
              <p className="mb-8 inline-flex rounded-full bg-[#f4e1d9] px-4 py-2 text-sm font-semibold text-[#8a5b4f]">
                {service.price}
              </p>
              <h3 className="text-2xl font-semibold">{service.title}</h3>
              <p className="mt-4 leading-7 text-[#76584f]">
                {service.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
      >
        <div className="rounded-[2.5rem] bg-[#241511] p-8 text-white md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#e8c8bd]">
            Meet Lisa
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            Feeling fantastic starts from within.
          </h2>
          <p className="mt-6 leading-8 text-[#ead9d4]">
            Founder Lisa created L&apos;Beau Clinique as a peaceful space for
            non-invasive, high-quality treatments that help clients feel
            supported, empowered, and beautifully confident.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="rounded-[2rem] border border-[#ead2c8] bg-white/65 p-6"
            >
              <div className="mb-6 h-10 w-10 rounded-full bg-[#9b5f53]" />
              <p className="text-lg font-semibold leading-7">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8">
        <div className="rounded-[3rem] bg-white p-6 shadow-2xl shadow-[#9c6f61]/10 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b5f53]">
                Cryo21 journey
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                Body sculpting without surgery or downtime.
              </h2>
              <p className="mt-5 leading-8 text-[#76584f]">
                Controlled cooling targets areas such as the tummy, thighs,
                jawline, arms, back, and cellulite. Results build as the body
                naturally eliminates treated fat cells.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {journey.map((step, index) => (
                <div key={step} className="rounded-[1.6rem] bg-[#fbf4ee] p-6">
                  <span className="text-sm font-semibold text-[#9b5f53]">
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
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b5f53]">
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
              className="rounded-full border border-[#ead2c8] bg-white/70 px-6 py-4 font-medium text-[#5e3c35]"
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
        <div className="grid overflow-hidden rounded-[3rem] bg-[#9b5f53] text-white lg:grid-cols-[1fr_0.85fr]">
          <div className="p-8 md:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f4dcd3]">
              Book your consultation
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Ready for your sculpt, strength and glow plan?
            </h2>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="tel:+4407717096809"
                className="rounded-full bg-white px-7 py-4 text-center font-semibold text-[#7e473e]"
              >
                Call 07717 096809
              </a>
              <a
                href="mailto:lbeauclinique@gmail.com"
                className="rounded-full border border-white/35 px-7 py-4 text-center font-semibold text-white"
              >
                Email the clinic
              </a>
            </div>
          </div>
          <div className="bg-[#241511] p-8 md:p-12">
            <h3 className="text-2xl font-semibold">Visit L&apos;Beau Clinique</h3>
            <p className="mt-4 leading-7 text-[#ead9d4]">
              2 Turpyn Court, Woughton on the Green, Milton Keynes MK6 3BW
            </p>
            <dl className="mt-8 grid gap-3 text-sm text-[#ead9d4]">
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
