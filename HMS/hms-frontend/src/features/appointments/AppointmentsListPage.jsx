import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
  fetchAppointments,
  getApiErrorMessage,
} from "@/features/appointments/api/appointmentsApi";
import AppointmentStatusBadge from "@/features/appointments/components/AppointmentStatusBadge";
import AppointmentRowActions from "@/features/appointments/components/AppointmentRowActions";

function formatRange(startIso, endIso) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    return `${s.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })} – ${e.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
  } catch {
    return "—";
  }
}

export default function AppointmentsListPage() {
  const auth = useAuth();
  const canManageStatus = auth.hasPermission("Appointments.ManageStatus");
  const canEdit = auth.hasPermission("Appointments.Create");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDate, setFilterDate] = useState("");
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppointments(filterDate || undefined);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 6000);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col space-y-4 sm:space-y-5">
      <section className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Appointments
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              View and manage schedules. Status rules match clinical policy on
              the server.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-slate-500">
                Day filter
              </span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <button
              type="button"
              onClick={() => setFilterDate("")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Show all days
            </button>
            {canEdit && (
              <Link
                to="/appointments/new"
                className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
              >
                <span className="text-base leading-none">+</span> New
                appointment
              </Link>
            )}
          </div>
        </div>
      </section>

      {toast && (
        <div
          role="status"
          className={
            toast.type === "error"
              ? "flex items-start justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
              : "flex items-start justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          }
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading appointments…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-slate-600">No appointments found.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                >
                  <td className="px-4 py-3 text-slate-800">
                    {formatRange(a.scheduledStart, a.scheduledEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/patients/${a.patientProfileId}`}
                      className="font-medium text-sky-800 hover:underline"
                    >
                      {a.patientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{a.doctorName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.departmentName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AppointmentStatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <AppointmentRowActions
                      appointment={a}
                      canManageStatus={canManageStatus}
                      canEdit={canEdit}
                      onMutated={load}
                      onToast={showToast}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
