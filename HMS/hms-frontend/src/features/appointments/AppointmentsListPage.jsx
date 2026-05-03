import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  fetchAppointments,
  getApiErrorMessage,
} from "@/features/appointments/api/appointmentsApi";
import AppointmentCalendar from "@/features/appointments/components/AppointmentCalendar";
import AppointmentRowActions from "@/features/appointments/components/AppointmentRowActions";
import AppointmentStatusBadge from "@/features/appointments/components/AppointmentStatusBadge";
import CalendarDayModal from "@/features/appointments/components/CalendarDayModal";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: APPOINTMENT_STATUS.SCHEDULED, label: "Scheduled" },
  { value: APPOINTMENT_STATUS.CONFIRMED, label: "Confirmed" },
  { value: APPOINTMENT_STATUS.COMPLETED, label: "Completed" },
  { value: APPOINTMENT_STATUS.CANCELLED, label: "Cancelled" },
  { value: APPOINTMENT_STATUS.NO_SHOW, label: "No show" },
];

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return `${start.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })} - ${end.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
}

function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${weekStart.toLocaleDateString(undefined, {
      month: "long",
    })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
  }
  return `${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} - ${weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function statusKey(status) {
  return String(status ?? "").trim().toLowerCase();
}

const SUMMARY_TONES = {
  slate: "border-slate-200 bg-white text-slate-500",
  sky: "border-sky-200 bg-sky-50/60 text-sky-600",
  emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-600",
  rose: "border-rose-200 bg-rose-50/60 text-rose-500",
};

function SummaryTile({ label, value, icon, tone = "slate" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-950">
            {value}
          </p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${SUMMARY_TONES[tone]}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  const optionClass = (value) =>
    [
      "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition",
      view === value
        ? "bg-sky-700 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ");

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("schedule")}
        className={optionClass("schedule")}
        aria-pressed={view === "schedule"}
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        Schedule
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={optionClass("list")}
        aria-pressed={view === "list"}
      >
        <List className="h-4 w-4" aria-hidden />
        List
      </button>
    </div>
  );
}

function WeekNav({ weekStart, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, -7))}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <div className="min-w-[13rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-900">
        {formatWeekLabel(weekStart)}
      </div>
      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, 7))}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfWeek(new Date()))}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        Today
      </button>
    </div>
  );
}

export default function AppointmentsListPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const canManageStatus = auth.hasPermission("Appointments.ManageStatus");
  const canEdit = auth.hasPermission("Appointments.Create");
  const canVisit =
    auth.hasPermission("Encounters.Create") && auth.hasPermission("Encounters.Read");
  const encounterBasePath =
    auth.userRole === "Doctor" ? "/doctor/encounters" : "/admin/encounters";

  const [view, setView] = useState("schedule");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters =
        view === "schedule"
          ? {
              from: weekStart.toISOString(),
              to: addDays(weekStart, 7).toISOString(),
            }
          : filterDate
          ? { date: filterDate }
          : undefined;

      const data = await fetchAppointments(filters);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterDate, view, weekStart]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((appointment) => {
      if (
        statusFilter !== "all" &&
        statusKey(appointment.status) !== statusFilter
      ) {
        return false;
      }

      if (!term) return true;
      const haystack = [
        appointment.patientName,
        appointment.doctorName,
        appointment.departmentName,
        appointment.appointmentType,
        appointment.reason,
        appointment.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(() => {
    const next = {
      total: filteredItems.length,
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    for (const item of filteredItems) {
      const key = statusKey(item.status);
      if (key in next) next[key] += 1;
    }
    return next;
  }, [filteredItems]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDay) return [];
    return filteredItems.filter((appointment) =>
      isSameDay(new Date(appointment.scheduledStart), selectedDay)
    );
  }, [filteredItems, selectedDay]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reception schedule
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Appointments
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Visits booked by reception for registered patients.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <ViewToggle view={view} onChange={setView} />
          {canEdit && (
            <Link
              to="/appointments/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New appointment
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={refreshing || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={view === "schedule" ? "Week total" : "Showing"}
          value={counts.total}
          tone="slate"
          icon={<CalendarClock className="h-4 w-4" aria-hidden />}
        />
        <SummaryTile
          label="Scheduled"
          value={counts.scheduled}
          tone="sky"
          icon={<CalendarDays className="h-4 w-4" aria-hidden />}
        />
        <SummaryTile
          label="Confirmed"
          value={counts.confirmed}
          tone="emerald"
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        />
        <SummaryTile
          label="Closed"
          value={counts.completed + counts.cancelled + counts.no_show}
          tone="rose"
          icon={<XCircle className="h-4 w-4" aria-hidden />}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div
            className={
              view === "list"
                ? "grid gap-3 md:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto]"
                : "grid gap-3 md:grid-cols-[minmax(16rem,1fr)_12rem_auto]"
            }
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <span className="relative mt-1.5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Patient, doctor, department"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {view === "list" ? (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Day
                </span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(event) => setFilterDate(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </label>
            ) : (
              null
            )}

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setFilterDate("");
              }}
              className="h-10 self-end rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          {view === "schedule" ? (
            <WeekNav weekStart={weekStart} onChange={setWeekStart} />
          ) : (
            <button
              type="button"
              onClick={() => setFilterDate("")}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Show all
            </button>
          )}
        </div>
      </section>

      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={
            toast.type === "error"
              ? "flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              : "flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          }
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
            Loading appointments...
          </div>
        ) : view === "schedule" ? (
          <AppointmentCalendar
            appointments={filteredItems}
            weekStart={weekStart}
            canCreate={canEdit}
            onCreate={() => navigate("/appointments/new")}
            onDayClick={(date) => setSelectedDay(date)}
            onAppointmentClick={(appointment) =>
              setSelectedDay(new Date(appointment.scheduledStart))
            }
          />
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div>
              <CalendarClock className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-900">
                No appointments found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjust filters or create a new appointment.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
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
                {filteredItems.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-800">
                      {formatRange(
                        appointment.scheduledStart,
                        appointment.scheduledEnd
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/patients/${appointment.patientProfileId}`}
                        className="font-medium text-sky-800 hover:underline"
                      >
                        {appointment.patientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {appointment.doctorName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {appointment.departmentName ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <AppointmentStatusBadge status={appointment.status} />
                    </td>
                    <td className="px-4 py-3">
                      <AppointmentRowActions
                        appointment={appointment}
                        canManageStatus={canManageStatus}
                        canEdit={canEdit}
                        canVisit={canVisit}
                        encounterBasePath={encounterBasePath}
                        onMutated={load}
                        onToast={showToast}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CalendarDayModal
        date={selectedDay}
        appointments={selectedDayAppointments}
        canManageStatus={canManageStatus}
        canEdit={canEdit}
        canVisit={canVisit}
        encounterBasePath={encounterBasePath}
        canCreate={canEdit}
        onMutated={load}
        onToast={showToast}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}
