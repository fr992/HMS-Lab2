import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { useDoctorOptionsStore } from "@/features/patients/doctorOptionsStore";
import { getPagedItems, getPagination, MAX_LIST_PAGE_SIZE, PaginationBar } from "@/lib/pagination.jsx";
import {
  APPOINTMENT_REQUEST_STATUS,
  fetchAppointmentRequests,
  getApiErrorMessage,
  patchAppointmentRequestStatus,
} from "@/features/appointmentRequests/api/appointmentRequestsApi";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: APPOINTMENT_REQUEST_STATUS.PENDING, label: "Pending" },
  { value: APPOINTMENT_REQUEST_STATUS.CONFIRMED, label: "Confirmed" },
  { value: APPOINTMENT_REQUEST_STATUS.COMPLETED, label: "Completed" },
  { value: APPOINTMENT_REQUEST_STATUS.CANCELLED, label: "Cancelled" },
];

const STATUS_META = {
  pending: {
    label: "Pending",
    icon: Clock3,
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    icon: CalendarCheck,
    badge: "bg-sky-50 text-sky-900 ring-sky-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    badge: "bg-rose-50 text-rose-900 ring-rose-200",
  },
};

function statusKey(status) {
  return String(status ?? "").trim().toLowerCase();
}

function parseDateOnly(value) {
  if (!value) return null;
  const parts = String(value).split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateOnly(value) {
  const date = parseDateOnly(value);
  if (!date) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getFullName(request) {
  return `${request.firstName ?? ""} ${request.lastName ?? ""}`.trim();
}

function RequestStatusBadge({ status }) {
  const key = statusKey(status);
  const meta = STATUS_META[key] ?? {
    label: status || "Unknown",
    icon: Clock3,
    badge: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

function SummaryTile({ label, value, icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        <CountUpValue value={value} />
      </p>
    </div>
  );
}

function getNextActions(status) {
  const key = statusKey(status);
  if (key === "pending") {
    return [
      { label: "Save doctor", status: APPOINTMENT_REQUEST_STATUS.PENDING },
      { label: "Confirm", status: APPOINTMENT_REQUEST_STATUS.CONFIRMED },
      { label: "Cancel", status: APPOINTMENT_REQUEST_STATUS.CANCELLED, danger: true },
    ];
  }
  if (key === "confirmed") {
    return [
      { label: "Complete", status: APPOINTMENT_REQUEST_STATUS.COMPLETED },
      { label: "Cancel", status: APPOINTMENT_REQUEST_STATUS.CANCELLED, danger: true },
    ];
  }
  if (key === "cancelled" || key === "completed") {
    return [
      { label: "Reopen", status: APPOINTMENT_REQUEST_STATUS.PENDING, icon: RotateCcw },
    ];
  }
  return [];
}

export default function AppointmentRequestsPage() {
  const auth = useAuth();
  const canManageStatus = auth.hasPermission("Appointments.ManageStatus");
  const canCreateAppointment = auth.hasPermission("Appointments.Create");

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [preferredDate, setPreferredDate] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [doctorSelections, setDoctorSelections] = useState({});
  const loadDoctors = useDoctorOptionsStore((state) => state.load);
  const doctors = useDoctorOptionsStore((state) => state.items);
  const doctorsStatus = useDoctorOptionsStore((state) => state.status);
  const doctorsError = useDoctorOptionsStore((state) => state.error);

  useEffect(() => {
    if (canManageStatus) void loadDoctors();
  }, [canManageStatus, loadDoctors]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppointmentRequests({
        status: statusFilter,
        preferredDate,
        search: search.trim() || undefined,
        page,
        pageSize: MAX_LIST_PAGE_SIZE,
      });
      setItems(getPagedItems(data));
      setPagination(getPagination(data));
    } catch (e) {
      setError(getApiErrorMessage(e));
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preferredDate, statusFilter, search, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const filteredItems = items;

  const counts = useMemo(() => {
    const next = {
      total: items.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const item of items) {
      const key = statusKey(item.status);
      if (key in next) next[key] += 1;
    }
    return next;
  }, [items]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, preferredDate]);

  const requestPage = { items: filteredItems, pagination };

  const selectedDoctorIdFor = (request) => {
    const raw = doctorSelections[request.id] ?? request.doctorProfileId ?? "";
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const updateStatus = async (request, nextStatus) => {
    if (!canManageStatus || mutatingId != null) return;
    const doctorProfileId = selectedDoctorIdFor(request);
    if (nextStatus === APPOINTMENT_REQUEST_STATUS.CONFIRMED && !doctorProfileId) {
      showToast("Assign a doctor before confirming this request.", "warning");
      return;
    }

    setMutatingId(request.id);
    try {
      await patchAppointmentRequestStatus(request.id, nextStatus, doctorProfileId);
      showToast("Request status updated.");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Public website
          </p>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Appointment requests submitted from the public booking form.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreateAppointment && (
            <Link
              to="/appointments/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <CalendarClock className="h-4 w-4" aria-hidden />
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Total"
          value={counts.total}
          icon={<CalendarClock className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Pending"
          value={counts.pending}
          icon={<Clock3 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Confirmed"
          value={counts.confirmed}
          icon={<CalendarCheck className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Closed"
          value={counts.completed + counts.cancelled}
          icon={<CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end">
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
                placeholder="Name, email, phone, reason"
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
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Preferred date
            </span>
            <input
              type="date"
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setPreferredDate("");
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </section>

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
            Loading requests...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center p-8 text-center">
            <div>
              <CalendarClock className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-900">
                No requests found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjust filters or refresh after a public form submission.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requestPage.items.map((request) => {
              const actions = getNextActions(request.status);
              const busy = mutatingId === request.id;
              return (
                <article key={request.id} className="p-4 transition hover:bg-slate-50/70">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-slate-950">
                          {getFullName(request) || `Request #${request.id}`}
                        </h2>
                        <RequestStatusBadge status={request.status} />
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        {request.reasonForVisit}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <a
                        href={`mailto:${request.email}`}
                        className="flex min-w-0 items-center gap-2 hover:text-sky-700"
                      >
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate">{request.email}</span>
                      </a>
                      <a
                        href={`tel:${request.phone}`}
                        className="flex min-w-0 items-center gap-2 hover:text-sky-700"
                      >
                        <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate">{request.phone}</span>
                      </a>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm xl:grid-cols-1">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Preferred
                        </dt>
                        <dd className="mt-1 text-slate-800">
                          {formatDateOnly(request.preferredDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Submitted
                        </dt>
                        <dd className="mt-1 text-slate-800">
                          {formatDateTime(request.createdAt)}
                        </dd>
                      </div>
                      <div className="col-span-2 xl:col-span-1">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Doctor
                        </dt>
                        <dd className="mt-1">
                          {canManageStatus && statusKey(request.status) === "pending" ? (
                            <select
                              value={doctorSelections[request.id] ?? request.doctorProfileId ?? ""}
                              onChange={(event) =>
                                setDoctorSelections((current) => ({
                                  ...current,
                                  [request.id]: event.target.value,
                                }))
                              }
                              disabled={busy || mutatingId != null || doctorsStatus === "loading"}
                              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60"
                            >
                              <option value="">
                                {doctorsStatus === "loading" ? "Loading doctors..." : "Assign doctor"}
                              </option>
                              {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                  {doctor.fullName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-800">
                              {request.doctorName || "Unassigned"}
                            </span>
                          )}
                          {doctorsError && canManageStatus ? (
                            <span className="mt-1 block text-xs text-rose-600">{doctorsError}</span>
                          ) : null}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {canManageStatus &&
                        actions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={`${request.id}-${action.status}`}
                              type="button"
                              onClick={() => updateStatus(request, action.status)}
                              disabled={busy || mutatingId != null}
                              className={
                                action.danger
                                  ? "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                                  : "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                              }
                            >
                              {Icon && <Icon className="h-4 w-4" aria-hidden />}
                              {busy ? "Saving..." : action.label}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <PaginationBar pagination={requestPage.pagination} loading={loading} onPageChange={setPage} />
      </div>
    </div>
  );
}
