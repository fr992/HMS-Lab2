import {
  Activity,
  ArrowUpRight,
  Bone,
  Brain,
  CheckCircle2,
  HeartPulse,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { CLINICS } from "@/features/landing/landingData";

const CLINIC_ICONS = {
  heart: HeartPulse,
  brain: Brain,
  activity: Activity,
  sparkles: Sparkles,
  bone: Bone,
  scan: ScanLine,
};

const CLINIC_TONES = [
  "bg-sky-50 text-sky-700 ring-sky-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
  "bg-amber-50 text-amber-700 ring-amber-100",
  "bg-indigo-50 text-indigo-700 ring-indigo-100",
  "bg-cyan-50 text-cyan-700 ring-cyan-100",
];

export default function ClinicsSection() {
  return (
    <section id="clinics" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="landing-reveal flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-sky-700">Departments</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              Clinics organized for fast, connected care.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Each clinic connects appointments, doctors, diagnostics, and
              follow-up into one clear patient pathway.
            </p>
          </div>
          <a
            href="#appointment"
            className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 md:self-auto"
          >
            Request a Visit
            <ArrowUpRight className="size-4" />
          </a>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLINICS.map((clinic, i) => (
            <ClinicCard key={clinic.id} clinic={clinic} tone={CLINIC_TONES[i % CLINIC_TONES.length]} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ClinicCard({ clinic, tone, index }) {
  const Icon = CLINIC_ICONS[clinic.icon] ?? HeartPulse;

  return (
    <div className={`landing-reveal landing-delay-${Math.min(index + 1, 5)} group rounded-md border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03] transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-950/[0.07]`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`inline-flex size-11 items-center justify-center rounded-md ring-1 ${tone}`}>
          <Icon className="size-5" />
        </span>
        <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-slate-700" />
      </div>

      <h3 className="mt-5 text-base font-semibold text-slate-950">{clinic.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{clinic.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {clinic.services.map((service) => (
          <span
            key={service}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
          >
            <CheckCircle2 className="size-3 text-emerald-600" />
            {service}
          </span>
        ))}
      </div>
    </div>
  );
}
