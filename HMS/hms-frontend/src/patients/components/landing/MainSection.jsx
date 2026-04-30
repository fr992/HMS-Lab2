import { STATS } from "@/features/landing/landingData";

export default function MainSection() {
  return (
    <section className="relative overflow-hidden bg-slate-900 text-white">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #0ea5e9 0%, transparent 50%), radial-gradient(circle at 80% 20%, #0284c7 0%, transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-24 lg:py-36">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-sky-400">
            Established 1987 · Accredited Excellence
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-6xl">
            Where Expertise
            <br />
            <span className="text-sky-400">Meets Compassion</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400">
            A world-class academic medical center delivering advanced diagnostics,
            surgical precision, and patient-centered care across 24 specialties.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#appointment"
              className="rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Book an Appointment
            </a>
            <a
              href="#clinics"
              className="rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              Our Clinics
            </a>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map(({ label, value }) => (
            <div key={label} className="border-l border-slate-700 pl-4">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}