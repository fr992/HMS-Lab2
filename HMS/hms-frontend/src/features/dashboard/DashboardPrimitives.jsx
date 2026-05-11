import { AlertCircle, Bell, LayoutDashboard, RefreshCw, Search } from "lucide-react";
import QuickAddMenu from "@/features/dashboard/QuickAddMenu";
import { initials } from "@/features/dashboard/dashboardUtils";

export function DashboardFrame({
  title = "Dashboard",
  subtitle,
  userName,
  userRole,
  search,
  onSearchChange,
  searchPlaceholder = "Search dashboard...",
  quickAddActions = [],
  children,
}) {
  return (
    <div className="min-h-full bg-slate-50">
      <header className="sticky top-0 z-30 rounded-t-lg border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-col gap-4 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-4">
            <div className="hidden size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 lg:flex">
              <LayoutDashboard className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-tight text-slate-950">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {subtitle || `Welcome back, ${userName || "User"}.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {onSearchChange && (
              <label className="relative block sm:w-[25rem]">
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

            <button
              type="button"
              className="relative inline-flex size-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                {initials(userName, userRole || "U")}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-950">
                  {userName || "User"}
                </p>
                <p className="text-xs text-slate-500">{userRole || "Portal"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-5 lg:p-6">{children}</div>
    </div>
  );
}

export function MetricCard({ label, value, helper, icon, tone = "bg-blue-50 text-blue-700" }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold leading-none text-slate-950">
            {value ?? 0}
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

export function CardShell({ title, action, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LoadingDashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
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
