import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, RefreshCw, Stethoscope } from "lucide-react";
import AppointmentStatusBadge from "@/features/appointments/components/AppointmentStatusBadge";
import { fetchMyAppointments } from "@/features/patientPortal/patientPortalApi";
import {
  formatDateTime,
  getApiErrorMessage,
  isUpcomingAppointment,
  titleCase,
} from "@/features/dashboard/dashboardUtils";

export default function PatientAppointmentsPage() {
  const [state, setState] = useState({ status: "loading", items: [], error: "" });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const items = await fetchMyAppointments();
      setState({ status: "ready", items: Array.isArray(items) ? items : [], error: "" });
    } catch (error) {
      setState({ status: "error", items: [], error: getApiErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const upcoming = state.items.filter(isUpcomingAppointment);
    const history = state.items.filter((item) => !isUpcomingAppointment(item));
    return { upcoming, history };
  }, [state.items]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        title="My appointments"
        subtitle="Upcoming and previous visits scheduled with your care team."
        onRefresh={load}
        refreshing={state.status === "loading"}
      />
      {state.status === "error" && <ErrorBox message={state.error} />}
      {state.status === "loading" && <LoadingBox label="Loading appointments..." />}
      {state.status === "ready" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <AppointmentPanel title="Upcoming" items={grouped.upcoming} empty="No upcoming appointments." />
          <AppointmentPanel title="History" items={grouped.history} empty="No previous appointments." />
        </div>
      )}
    </div>
  );
}

function AppointmentPanel({ title, items, empty }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {items.length === 0 ? (
        <EmptyBox>{empty}</EmptyBox>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <article key={item.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-950">
                    {item.appointmentType || "Appointment"}
                  </h3>
                  <AppointmentStatusBadge status={item.status} />
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <Stethoscope className="size-4 text-slate-400" aria-hidden />
                  {[item.doctorName, item.departmentName].filter(Boolean).join(" - ") || "-"}
                </p>
                {item.reason && <p className="mt-2 text-sm text-slate-500">{item.reason}</p>}
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 md:justify-end">
                <Clock3 className="size-4 text-slate-400" aria-hidden />
                {formatDateTime(item.scheduledStart)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function PageHeader({ title, subtitle, onRefresh, refreshing }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      )}
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      {message}
    </div>
  );
}

export function LoadingBox({ label }) {
  return (
    <div className="flex min-h-[16rem] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
      {label}
    </div>
  );
}

export function EmptyBox({ children }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center p-6 text-center">
      <div>
        <CalendarDays className="mx-auto size-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">{children}</p>
      </div>
    </div>
  );
}

export function StatusPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
      {titleCase(children)}
    </span>
  );
}
