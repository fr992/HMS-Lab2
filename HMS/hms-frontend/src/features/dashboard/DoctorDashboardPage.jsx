import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GripVertical,
  LayoutDashboard,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  fetchDoctorDashboard,
  getApiErrorMessage,
} from "@/features/dashboard/doctorDashboardApi";
import {
  AnimatedStatNumber,
  DashboardPageSkeleton,
} from "@/features/dashboard/DashboardPrimitives";
import QuickAddMenu from "@/features/dashboard/QuickAddMenu";

const emptyDashboard = {
  doctorName: "",
  todayAppointmentsCount: 0,
  upcomingAppointmentsCount: 0,
  primaryPatientsCount: 0,
  interactedPatientsCount: 0,
  openEncountersCount: 0,
  completedEncountersCount: 0,
  recentPatients: [],
  todaySchedule: [],
};

function initials(name, fallback = "DR") {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const elapsedMs = Date.now() - date.getTime();
  if (elapsedMs < 0) return formatShortDate(date);

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatShortDate(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatStatusLabel(status) {
  if (!status) return null;
  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DoctorDashboardPage() {
  const auth = useAuth();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [search, setSearch] = useState("");

  const loadDashboard = async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchDoctorDashboard();
      setDashboard({ ...emptyDashboard, ...(data ?? {}) });
      setStatus("ready");
    } catch (err) {
      setError(getApiErrorMessage(err));
      setStatus("error");
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const displayName = dashboard.doctorName || auth.userName || "Doctor";
  const normalizedSearch = search.trim().toLowerCase();

  const metrics = useMemo(
    () => [
      {
        label: "Today's Appointments",
        value: dashboard.todayAppointmentsCount,
        icon: CalendarDays,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        label: "Upcoming Appointments",
        value: dashboard.upcomingAppointmentsCount,
        icon: Clock3,
        tone: "bg-teal-50 text-teal-700",
      },
      {
        label: "Primary Patients",
        value: dashboard.primaryPatientsCount,
        icon: Users,
        tone: "bg-emerald-50 text-emerald-700",
      },
      {
        label: "Interacted Patients",
        value: dashboard.interactedPatientsCount,
        icon: UserRound,
        tone: "bg-sky-50 text-sky-700",
      },
      {
        label: "Open Encounters",
        value: dashboard.openEncountersCount,
        icon: Activity,
        tone: "bg-amber-50 text-amber-700",
      },
      {
        label: "Completed Encounters",
        value: dashboard.completedEncountersCount,
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-700",
      },
    ],
    [dashboard]
  );

  const filteredRecentPatients = useMemo(() => {
    if (!normalizedSearch) return dashboard.recentPatients;
    return dashboard.recentPatients.filter((patient) =>
      [
        patient.fullName,
        patient.departmentName,
        patient.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [dashboard.recentPatients, normalizedSearch]);

  const filteredTodaySchedule = useMemo(() => {
    if (!normalizedSearch) return dashboard.todaySchedule;
    return dashboard.todaySchedule.filter((appointment) =>
      [
        appointment.patientName,
        appointment.appointmentType,
        appointment.status,
        appointment.reason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [dashboard.todaySchedule, normalizedSearch]);

  return (
    <div className="min-h-full bg-slate-50">
      <DashboardHeader
        displayName={displayName}
        userName={auth.userName}
        search={search}
        onSearchChange={setSearch}
        quickAddActions={[
          {
            label: "Register Patient",
            to: "/patients/new",
            kind: "patient",
            visible: auth.hasPermission("Patients.Register"),
          },
          {
            label: "New Appointment",
            to: "/appointments/new",
            kind: "appointment",
            visible: auth.hasPermission("Appointments.Create"),
          },
        ]}
      />

      <div className="space-y-6 p-4 sm:p-5 lg:p-6">
        {status === "loading" && (
          <DashboardPageSkeleton statCount={6} cardCount={2} columns="lg:grid-cols-3" />
        )}

        {status === "error" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            <p className="font-semibold">Unable to load dashboard.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-4 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {status === "ready" && (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(21rem,1fr)]">
              <RecentPatientsCard items={filteredRecentPatients} />
              <TodayScheduleCard items={filteredTodaySchedule} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardHeader({
  displayName,
  search,
  onSearchChange,
  quickAddActions,
}) {
  return (
    <header className="sticky top-0 z-30 rounded-t-lg border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-4">
          <div className="hidden size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 lg:flex">
            <LayoutDashboard className="size-5" />
          </div>
          <div>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, Dr. {displayName}.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-[25rem]">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search patients, appointments..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-100 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <QuickAddMenu actions={quickAddActions} />

        </div>
      </div>
    </header>
  );
}

function MetricCard({ metric }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {metric.label}
          </p>
          <p className="mt-3 text-3xl font-semibold leading-none text-slate-950">
            <AnimatedStatNumber value={metric.value} />
          </p>
        </div>
        <div className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${metric.tone}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </article>
  );
}

function CardShell({ title, action, children }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <div className="flex items-center gap-6">
          {action}
          <GripVertical className="size-4 text-slate-300" />
        </div>
      </div>
      {children}
    </article>
  );
}

function RecentPatientsCard({ items }) {
  return (
    <CardShell
      title="Recent Patients"
      action={
        <Link to="/patients" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View all
        </Link>
      }
    >
      {!items?.length ? (
        <EmptyText>No recent patients found.</EmptyText>
      ) : (
        <div className="divide-y divide-slate-200">
          {items.map((patient) => (
            <div
              key={patient.patientProfileId}
              className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {initials(patient.fullName, "PT")}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">
                    {patient.fullName || "Patient"}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {patient.departmentName || "Department unavailable"}
                    {patient.age != null ? ` - Age ${patient.age}` : ""}
                  </p>
                </div>
              </div>

              <PatientStatusBadge status={patient.status} />

              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Clock3 className="size-4" />
                {formatRelativeTime(patient.lastActivityAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function TodayScheduleCard({ items }) {
  return (
    <CardShell
      title="Today's Schedule"
      action={
        <Link to="/appointments" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View
        </Link>
      }
    >
      {!items?.length ? (
        <EmptyText>No appointments scheduled for today.</EmptyText>
      ) : (
        <div className="space-y-3">
          {items.map((appointment) => (
            <div
              key={appointment.appointmentId}
              className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {appointment.appointmentType || "Appointment"}
                  </span>
                  <p className="mt-3 truncate font-semibold text-slate-950">
                    {appointment.patientName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {appointment.reason || formatStatusLabel(appointment.status) || "-"}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-blue-600">
                  {formatTime(appointment.scheduledStart)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function PatientStatusBadge({ status }) {
  const label = formatStatusLabel(status);
  if (!label) return <span className="hidden sm:block" />;

  const normalized = String(status).toLowerCase();
  const classes =
    normalized === "completed" || normalized === "discharged"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "open" || normalized === "confirmed"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized === "cancelled" || normalized === "no_show"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function EmptyText({ children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  );
}

