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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLandingDepartments } from "@/features/landing/api/landingDepartmentsApi";
import { useLandingLanguage } from "@/features/landing/landingLanguage";

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

const PREVIEW_COUNT = 6;

const ICON_MATCHERS = [
  { icon: "heart", pattern: /cardio|heart/i },
  { icon: "brain", pattern: /neuro|brain/i },
  { icon: "activity", pattern: /onco|cancer|internal|emergency/i },
  { icon: "sparkles", pattern: /pedia|child|family/i },
  { icon: "bone", pattern: /ortho|bone|spine|trauma/i },
  { icon: "scan", pattern: /radio|imaging|scan|diagnostic/i },
];

function normalizeDepartment(department, t) {
  const name = department?.name ?? department?.Name ?? t("clinics.defaultName");
  const icon = ICON_MATCHERS.find((item) => item.pattern.test(name))?.icon ?? "heart";

  return {
    id: department?.id ?? department?.Id ?? name,
    name,
    icon,
    description:
      department?.description ??
      department?.Description ??
      t("clinics.defaultDescription"),
    services: t("clinics.services"),
  };
}

export default function ClinicsSection() {
  const { t } = useLandingLanguage();
  const [showAll, setShowAll] = useState(false);
  const { data, isError, isFetching, isPending } = useQuery({
    queryKey: ["landing-departments", showAll],
    queryFn: () => fetchLandingDepartments({ pageSize: PREVIEW_COUNT, all: showAll }),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });
  const clinics = (data?.items ?? data?.Items ?? []).map((department) =>
    normalizeDepartment(department, t)
  );
  const totalCount = data?.totalCount ?? data?.TotalCount ?? clinics.length;
  const hasMore = totalCount > clinics.length;

  return (
    <section id="clinics" className="bg-cyan-50/60 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="landing-reveal flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600">{t("clinics.eyebrow")}</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-cyan-950 sm:text-4xl">
              {t("clinics.title")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-cyan-800/75">
              {t("clinics.description")}
            </p>
          </div>
          <a
            href="#appointment"
            className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-500 md:self-auto"
          >
            {t("clinics.cta")}
            <ArrowUpRight className="size-4" />
          </a>
        </div>

        {isError ? (
          <p className="mt-10 rounded-md border border-rose-100 bg-white px-4 py-3 text-sm font-medium text-rose-700">
            {t("clinics.unavailable")}
          </p>
        ) : null}

        {!isPending && !isError && clinics.length === 0 ? (
          <p className="mt-10 rounded-md border border-cyan-100 bg-white px-4 py-3 text-sm font-medium text-cyan-800">
            {t("clinics.empty")}
          </p>
        ) : null}

        {clinics.length > 0 ? (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clinics.map((clinic, i) => (
                <ClinicCard key={clinic.id} clinic={clinic} tone={CLINIC_TONES[i % CLINIC_TONES.length]} index={i} />
              ))}
            </div>

            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  disabled={isFetching}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-200 bg-white px-4 text-sm font-semibold text-cyan-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isFetching ? t("clinics.loading") : t("clinics.seeAll")(totalCount)}
                  <ArrowUpRight className="size-4" />
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function ClinicCard({ clinic, tone, index }) {
  const Icon = CLINIC_ICONS[clinic.icon] ?? HeartPulse;

  return (
    <div className={`landing-reveal landing-delay-${Math.min(index + 1, 5)} group rounded-md border border-cyan-100 bg-white p-5 shadow-sm shadow-cyan-950/4 transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-950/8`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`inline-flex size-11 items-center justify-center rounded-md ring-1 ${tone}`}>
          <Icon className="size-5" />
        </span>
        <ArrowUpRight className="size-4 text-cyan-300 transition group-hover:text-teal-700" />
      </div>

      <h3 className="mt-5 text-base font-semibold text-cyan-950">{clinic.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-cyan-800/75">{clinic.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {clinic.services.map((service) => (
          <span
            key={service}
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-100 bg-cyan-50/70 px-2.5 py-1 text-xs font-medium text-cyan-800"
          >
            <CheckCircle2 className="size-3 text-emerald-600" />
            {service}
          </span>
        ))}
      </div>
    </div>
  );
}
