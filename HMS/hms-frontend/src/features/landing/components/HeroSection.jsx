import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BriefcaseMedical,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import {
  EQUIPMENT,
  FALLBACK_LANDING_STATS,
  HERO_IMAGE_URL,
} from "@/features/landing/landingData";
import { fetchLandingStats } from "@/features/landing/api/landingStatsApi";

const numberFormatter = new Intl.NumberFormat("en-US");

const STAT_CARDS = [
  {
    key: "patients",
    label: "Registered patients",
    icon: UsersRound,
    tone: "border-sky-300/25 bg-sky-400/15 text-sky-100",
    patientApproximation: true,
  },
  {
    key: "staff",
    label: "Medical staff",
    icon: BriefcaseMedical,
    tone: "border-emerald-300/25 bg-emerald-400/15 text-emerald-100",
  },
  {
    key: "specialties",
    label: "Specialties",
    icon: Stethoscope,
    tone: "border-amber-300/25 bg-amber-300/15 text-amber-100",
  },
  {
    key: "equipment",
    label: "Advanced systems",
    icon: Activity,
    tone: "border-rose-300/25 bg-rose-300/15 text-rose-100",
  },
];

const HERO_SIGNALS = [
  { label: "Same-day triage", icon: ClipboardCheck },
  { label: "Integrated diagnostics", icon: HeartPulse },
  { label: "Secure patient portal", icon: ShieldCheck },
];

function normalizeStats(data) {
  return {
    patients: data?.patients ?? data?.Patients ?? FALLBACK_LANDING_STATS.patients,
    staff: data?.staff ?? data?.Staff ?? FALLBACK_LANDING_STATS.staff,
    doctors: data?.doctors ?? data?.Doctors ?? FALLBACK_LANDING_STATS.doctors,
    departments:
      data?.departments ?? data?.Departments ?? FALLBACK_LANDING_STATS.departments,
    specialties:
      data?.specialties ?? data?.Specialties ?? FALLBACK_LANDING_STATS.specialties,
    appointments:
      data?.appointments ?? data?.Appointments ?? FALLBACK_LANDING_STATS.appointments,
    equipment: EQUIPMENT.length,
  };
}

function formatPatientCount(value) {
  const count = Number(value) || 0;
  if (count >= 1000) return `${numberFormatter.format(Math.floor(count / 100) * 100)}+`;
  if (count >= 100) return `${numberFormatter.format(Math.floor(count / 10) * 10)}+`;
  return numberFormatter.format(count);
}

function formatExactCount(value) {
  return numberFormatter.format(Number(value) || 0);
}

export default function HeroSection() {
  const { data } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: fetchLandingStats,
    staleTime: 5 * 60 * 1000,
  });
  const stats = normalizeStats(data);

  return (
    <section id="home" className="relative isolate overflow-hidden bg-slate-950 text-white">
      <img
        src={HERO_IMAGE_URL}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.82) 46%, rgba(15, 23, 42, 0.44) 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/75 to-transparent" />

      <div className="relative mx-auto flex min-h-[calc(100svh-7rem)] max-w-7xl flex-col justify-center px-6 py-14 lg:px-8">
        <div className="max-w-3xl">
          <div className="landing-reveal inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100 backdrop-blur">
            <ShieldCheck className="size-3.5" />
            HMS Care Network | Established 1987
          </div>

          <h1 className="landing-reveal landing-delay-1 mt-5 max-w-2xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
            City Hospital
          </h1>

          <p className="landing-reveal landing-delay-2 mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            Advanced specialty care with coordinated diagnostics, secure patient
            records, and a clinical team built around faster decisions.
          </p>

          <div className="landing-reveal landing-delay-3 mt-8 flex flex-wrap gap-3">
            <a
              href="#appointment"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <CalendarCheck className="size-4" />
              Book an Appointment
            </a>
            <a
              href="#clinics"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore Clinics
              <ChevronRight className="size-4" />
            </a>
          </div>
        </div>

        <div className="landing-reveal landing-delay-4 mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((item) => (
            <StatCard key={item.key} item={item} value={stats[item.key]} />
          ))}
        </div>

        <div className="landing-reveal landing-delay-5 mt-5 flex flex-wrap gap-2 text-xs font-medium text-slate-200">
          {HERO_SIGNALS.map((signal) => {
            const Icon = signal.icon;

            return (
              <span
                key={signal.label}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/35 px-3 py-2 backdrop-blur"
              >
                <Icon className="size-3.5 text-sky-200" />
                {signal.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({ item, value }) {
  const Icon = item.icon;
  const displayValue = item.patientApproximation
    ? formatPatientCount(value)
    : formatExactCount(value);

  return (
    <div className="group rounded-md border border-white/10 bg-white/[0.08] p-4 shadow-2xl shadow-slate-950/20 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.12]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold leading-none text-white">{displayValue}</p>
          <p className="mt-2 text-xs font-medium text-slate-300">{item.label}</p>
        </div>
        <span className={`inline-flex size-10 items-center justify-center rounded-md border ${item.tone}`}>
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}
