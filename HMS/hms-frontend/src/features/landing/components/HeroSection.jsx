import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BriefcaseMedical,
  CheckCircle2,
  HeartPulse,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import {
  EQUIPMENT,
  FALLBACK_LANDING_STATS,
} from "@/features/landing/landingData";
import { fetchLandingStats } from "@/features/landing/api/landingStatsApi";
import { useLandingLanguage } from "@/features/landing/landingLanguage";
import { getLocalizedPublicSetting, usePublicSettings } from "@/features/landing/publicSettings";

const numberFormatter = new Intl.NumberFormat("en-US");

const SUMMARY_STATS = [
  {
    key: "patients",
    labelKey: "summaryStats.patients",
    patientApproximation: true,
  },
  {
    key: "doctors",
    labelKey: "summaryStats.doctors",
  },
  {
    key: "departments",
    labelKey: "summaryStats.departments",
  },
  {
    key: "equipment",
    labelKey: "summaryStats.equipment",
  },
];

const SNAPSHOT_CARDS = [
  {
    key: "patients",
    labelKey: "snapshot.patients",
    icon: UsersRound,
    tone: "bg-blue-50 text-blue-700",
    patientApproximation: true,
  },
  {
    key: "doctors",
    labelKey: "snapshot.doctors",
    icon: Stethoscope,
    tone: "bg-teal-50 text-teal-700",
  },
  {
    key: "staff",
    labelKey: "snapshot.staff",
    icon: BriefcaseMedical,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "equipment",
    labelKey: "snapshot.equipment",
    icon: HeartPulse,
    tone: "bg-cyan-50 text-cyan-700",
  },
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

function formatStat(item, stats) {
  return item.patientApproximation
    ? formatPatientCount(stats[item.key])
    : formatExactCount(stats[item.key]);
}

export default function HeroSection() {
  const { language, t } = useLandingLanguage();
  const { data } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: fetchLandingStats,
    staleTime: 5 * 60 * 1000,
  });
  const { settings } = usePublicSettings();
  const stats = normalizeStats(data);
  const heroTitle = getLocalizedPublicSetting(settings, "landing.heroTitle", language);
  const heroSubtitle = getLocalizedPublicSetting(settings, "landing.heroSubtitle", language);

  return (
    <section id="home" className="bg-[#f7fbfd]">
      <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-24">
        <div className="landing-reveal">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Sparkles className="size-4" />
            {t("heroBadge")}
          </div>

          <h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-[1.05] text-cyan-950 sm:text-6xl">
            {heroTitle}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-cyan-800/75 sm:text-lg">
            {heroSubtitle}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#appointment"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              {t("heroCta")}
              <ArrowRight className="size-4" />
            </a>
            <a
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-cyan-200 bg-white px-6 text-sm font-semibold text-cyan-950 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
            >
              {t("portalLogin")}
            </a>
          </div>

          <div className="mt-10 grid gap-5 border-t border-cyan-100 pt-8 sm:grid-cols-4">
            {SUMMARY_STATS.map((item) => (
              <SummaryStat key={item.key} item={item} stats={stats} t={t} />
            ))}
          </div>
        </div>

        <HospitalSnapshot stats={stats} t={t} />
      </div>
    </section>
  );
}

function SummaryStat({ item, stats, t }) {
  return (
    <div>
      <p className="text-3xl font-semibold leading-none text-cyan-950">
        {formatStat(item, stats)}
      </p>
      <p className="mt-2 text-sm font-medium text-cyan-800/65">{t(item.labelKey)}</p>
    </div>
  );
}

function HospitalSnapshot({ stats, t }) {
  return (
    <div className="landing-reveal landing-delay-2 rounded-md border border-cyan-100 bg-white p-5 shadow-2xl shadow-cyan-950/10 sm:p-7">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-cyan-800/60">{t("snapshot.eyebrow")}</p>
          <h2 className="mt-1 text-2xl font-semibold text-cyan-950">
            {t("snapshot.title")}
          </h2>
        </div>
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Activity className="size-5" />
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SNAPSHOT_CARDS.map((item) => (
          <SnapshotCard key={item.key} item={item} stats={stats} t={t} />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-cyan-900">
        <CheckCircle2 className="size-4 shrink-0 text-blue-600" />
        {t("snapshot.refreshed")}
      </div>
    </div>
  );
}

function SnapshotCard({ item, stats, t }) {
  const Icon = item.icon;

  return (
    <div className="rounded-md border border-cyan-100 bg-[#fbfdff] p-4">
      <span className={`inline-flex size-10 items-center justify-center rounded-md ${item.tone}`}>
        <Icon className="size-5" />
      </span>
      <p className="mt-5 text-3xl font-semibold leading-none text-cyan-950">
        {formatStat(item, stats)}
      </p>
      <p className="mt-2 text-sm font-medium text-cyan-800/65">{t(item.labelKey)}</p>
    </div>
  );
}
