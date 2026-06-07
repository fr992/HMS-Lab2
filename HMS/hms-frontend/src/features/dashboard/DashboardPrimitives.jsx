import { AlertCircle, LayoutDashboard, RefreshCw, Search } from "lucide-react";
import AnimatedStatNumber from "@/components/dashboard/AnimatedStatNumber";
import {
  ChartSkeleton,
  DashboardCardSkeleton,
  DashboardPageSkeleton,
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import QuickAddMenu from "@/features/dashboard/QuickAddMenu";

export function DashboardFrame({
  title = "Dashboard",
  subtitle,
  userName,
  search,
  onSearchChange,
  searchPlaceholder = "Search dashboard...",
  quickAddActions = [],
  children,
}) {
  return (
    <div className="min-h-full min-w-0 bg-slate-50">
      <header className="sticky top-0 z-30 rounded-t-lg border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-col gap-4 px-3 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 lg:flex">
              <LayoutDashboard className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-slate-950 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {subtitle || `Welcome back, ${userName || "User"}.`}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {onSearchChange && (
              <label className="relative block w-full sm:w-100">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-100 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </label>
            )}

            <QuickAddMenu actions={quickAddActions} />

          </div>
        </div>
      </header>

      <div className="space-y-5 p-3 sm:space-y-6 sm:p-5 lg:p-6">{children}</div>
    </div>
  );
}

function isAnimatedNumber(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (value == null || value === "") return true;
  return Number.isFinite(Number(String(value).replace(/,/g, "").trim()));
}

export function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "bg-blue-50 text-blue-700",
  prefix = "",
  suffix = "",
  decimals = 0,
  compact = false,
}) {
  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold leading-none text-slate-950">
            {isAnimatedNumber(value) ? (
              <AnimatedStatNumber
                value={value}
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
                compact={compact}
              />
            ) : (
              value
            )}
          </p>
          {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
        </div>
        <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          {icon}
        </span>
      </div>
    </article>
  );
}

export function CardShell({ title, action, children, id }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LoadingDashboard(props) {
  return <DashboardPageSkeleton {...props} />;
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">Unable to load dashboard.</p>
          <p className="mt-1">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-sm font-medium text-white transition hover:bg-rose-700"
            >
              <RefreshCw className="size-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ children = "No records found." }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  );
}

export function CountUpValue({ value, durationMs = 950, precision = 0, className }) {
  return (
    <AnimatedStatNumber
      value={value}
      duration={durationMs}
      decimals={precision}
      className={className}
    />
  );
}

export {
  AnimatedStatNumber,
  ChartSkeleton,
  DashboardCardSkeleton,
  DashboardPageSkeleton,
  StatCardSkeleton,
  TableSkeleton,
};
