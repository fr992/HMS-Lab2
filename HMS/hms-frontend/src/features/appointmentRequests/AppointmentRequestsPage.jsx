import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  X,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import DoctorSearchSelect from "@/features/patients/components/DoctorSearchSelect";
import { getPagedItems, getPagination, MAX_LIST_PAGE_SIZE, PaginationBar } from "@/lib/pagination.jsx";
import {
  APPOINTMENT_REQUEST_STATUS,
  fetchAppointmentRequests,
  getApiErrorMessage,
  patchAppointmentRequestStatus,
} from "@/features/appointmentRequests/api/appointmentRequestsApi";
import { patchAppointmentStatus } from "@/features/appointments/api/appointmentsApi";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: APPOINTMENT_REQUEST_STATUS.PENDING, label: "Pending" },
  { value: APPOINTMENT_REQUEST_STATUS.RESCHEDULED, label: "Rescheduled" },
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
  rescheduled: {
    label: "Rescheduled",
    icon: CalendarClock,
    badge: "bg-violet-50 text-violet-900 ring-violet-200",
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
  return `${request?.firstName ?? ""} ${request?.lastName ?? ""}`.trim();
}

function shortReason(reason) {
  const text = String(reason ?? "").trim();
  if (!text) return "No reason provided.";
  return text.length > 120 ? `${text.slice(0, 120).trim()}...` : text;
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
  if (key === "pending" || key === "rescheduled") {
    return [
      { label: "Confirm", status: APPOINTMENT_REQUEST_STATUS.CONFIRMED, primary: true },
      { label: "Reschedule", status: APPOINTMENT_REQUEST_STATUS.RESCHEDULED },
      { label: "Reject", status: APPOINTMENT_REQUEST_STATUS.CANCELLED, danger: true },
    ];
  }
  return [];
}

function InfoLine({ label, value, href, icon }) {
  const content = (
    <>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 min-w-0 text-sm font-medium text-slate-900">
        <span className="break-words">{value || "-"}</span>
      </dd>
    </>
  );

  if (!href) {
    return <div>{content}</div>;
  }

  return (
    <a href={href} className="block rounded-lg transition hover:text-sky-700">
      {content}
    </a>
  );
}

function RequestCard({ request, selected, onSelect }) {
  const name = getFullName(request) || `Request #${request.id}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full rounded-lg border p-4 text-left shadow-sm transition",
        selected
          ? "border-sky-300 bg-sky-50/70 ring-2 ring-sky-100"
          : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-950">{name}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Preferred {formatDateOnly(request.preferredDate)}
          </p>
        </div>
        <RequestStatusBadge status={request.appointmentStatus || request.status} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <Stethoscope className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="truncate">{request.doctorName || "Not assigned"}</span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">
        {shortReason(request.reasonForVisit)}
      </p>

      <span className="mt-3 inline-flex text-xs font-semibold text-sky-700">
        View request
      </span>
    </button>
  );
}

function RequestDetails({
  request,
  canManageStatus,
  mutating,
  doctorSelection,
  selectedDoctor,
  scheduledStart,
  isReschedulePending,
  onDoctorChange,
  onScheduledStartChange,
  onStatusChange,
  onOpenAction,
  onAppointmentStatusChange,
}) {
  const name = getFullName(request) || `Request #${request.id}`;
  const actions = getNextActions(request.status).map((action) =>
    action.status === APPOINTMENT_REQUEST_STATUS.CONFIRMED && isReschedulePending
      ? { ...action, label: "Confirm Reschedule" }
      : action
  );
  const isPending = ["pending", "rescheduled"].includes(statusKey(request.status));
  const appointmentActions =
    request.appointmentStatus === APPOINTMENT_STATUS.CONFIRMED
      ? [
          { label: "Check In Patient", status: APPOINTMENT_STATUS.CHECKED_IN, primary: true },
          { label: "Cancel Appointment", status: APPOINTMENT_STATUS.CANCELLED, danger: true },
        ]
      : [];

  return (
    <section>
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Request details
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">
              {name}
            </h2>
          </div>
          <RequestStatusBadge status={request.appointmentStatus || request.status} />
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoLine
            label="Requester"
            value={name}
            icon={<UserRound className="h-3.5 w-3.5" aria-hidden />}
          />
          <InfoLine
            label="Email"
            value={request.email}
            href={request.email ? `mailto:${request.email}` : undefined}
            icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
          />
          <InfoLine
            label="Phone"
            value={request.phone}
            href={request.phone ? `tel:${request.phone}` : undefined}
            icon={<Phone className="h-3.5 w-3.5" aria-hidden />}
          />
          <InfoLine label="Preferred date" value={formatDateOnly(request.preferredDate)} />
          <InfoLine label="Submitted" value={formatDateTime(request.createdAt)} />
          <InfoLine
            label="Current status"
            value={request.appointmentStatus || STATUS_META[statusKey(request.status)]?.label || request.status}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
            Reason / message
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {request.reasonForVisit || "No reason provided."}
          </p>
        </div>

        {request.rejectionReason && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Rejection reason</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-rose-900">{request.rejectionReason}</p>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Doctor assignment</h3>
              <p className="mt-1 text-sm text-slate-500">
                Current doctor: {request.doctorName || "Not assigned"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            {canManageStatus && isPending ? (
              <DoctorSearchSelect
                value={doctorSelection ?? request.doctorProfileId ?? ""}
                onValueChange={onDoctorChange}
                selectedDoctor={selectedDoctor}
                placeholder="Search doctor by name or specialty"
                emptyLabel="Not assigned"
                minSearchLength={1}
                disabled={mutating}
              />
            ) : (
              <p className="text-sm font-medium text-slate-900">
                {request.doctorName || "Not assigned"}
              </p>
            )}
          </div>
          {canManageStatus && isPending && (
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Appointment date and time
              </span>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(event) => onScheduledStartChange(event.target.value)}
                disabled={mutating}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
          )}
          {isReschedulePending && (
            <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              The new time is staged. Assign a doctor and confirm the reschedule to notify the patient.
            </p>
          )}
        </div>

        {canManageStatus && (actions.length > 0 || appointmentActions.length > 0) && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            {[...actions, ...appointmentActions].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.status}
                  type="button"
                  onClick={() =>
                    appointmentActions.includes(action)
                      ? onAppointmentStatusChange(action.status)
                      : action.status === APPOINTMENT_REQUEST_STATUS.CONFIRMED
                        ? onStatusChange(action.status)
                        : onOpenAction(action.status)
                  }
                  disabled={mutating}
                  className={[
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition disabled:opacity-50",
                    action.primary
                      ? "bg-sky-600 text-white hover:bg-sky-700"
                      : action.danger
                        ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden />}
                  {mutating ? "Saving..." : action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function RequestDetailsModal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div
      className="hms-modal-overlay"
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
      >
        <div className="hms-modal-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Online request
            </p>
            <h2 id="request-detail-title" className="mt-1 text-lg font-semibold text-slate-950">
              Review request
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close request details"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function RequestActionModal({
  action,
  request,
  rescheduleDraft,
  rejectionReason,
  mutating,
  onRescheduleDraftChange,
  onRejectionReasonChange,
  onClose,
  onSubmit,
}) {
  if (!action || !request) return null;
  const isReschedule = action === APPOINTMENT_REQUEST_STATUS.RESCHEDULED;

  return (
    <div className="hms-modal-overlay" role="presentation">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="hms-modal-header">
          <h2 className="text-lg font-semibold text-slate-950">
            {isReschedule ? "Reschedule appointment" : "Reject appointment"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="p-5">
          {isReschedule ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-800">New appointment date and time</span>
              <input
                required
                type="datetime-local"
                value={rescheduleDraft}
                onChange={(event) => onRescheduleDraftChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                This only selects the new time. You will return to the request details to assign a doctor and confirm.
              </span>
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-slate-800">Rejection reason (optional)</span>
              <textarea
                value={rejectionReason}
                onChange={(event) => onRejectionReasonChange(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Add a short explanation for the patient"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <button type="button" onClick={onClose} disabled={mutating} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold">
            Cancel
          </button>
          <button type="submit" disabled={mutating || (isReschedule && !rescheduleDraft)} className={`h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50 ${isReschedule ? "bg-sky-600" : "bg-rose-600"}`}>
            {mutating ? "Saving..." : isReschedule ? "Use new time" : "Reject"}
          </button>
        </div>
      </form>
    </div>
  );
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
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [doctorSelections, setDoctorSelections] = useState({});
  const [selectedDoctors, setSelectedDoctors] = useState({});
  const [scheduledStarts, setScheduledStarts] = useState({});
  const [pendingAction, setPendingAction] = useState(null);
  const [rescheduleDraft, setRescheduleDraft] = useState("");
  const [rescheduleConfirmations, setRescheduleConfirmations] = useState({});
  const [rejectionReason, setRejectionReason] = useState("");

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

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, preferredDate]);

  useEffect(() => {
    if (selectedRequestId && !items.some((item) => item.id === selectedRequestId)) {
      setSelectedRequestId(null);
    }
  }, [items, selectedRequestId]);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const counts = useMemo(() => {
    const next = {
      total: items.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      rescheduled: 0,
    };
    for (const item of items) {
      const key = statusKey(item.status);
      if (key in next) next[key] += 1;
    }
    return next;
  }, [items]);

  const selectedRequest = useMemo(
    () => items.find((item) => item.id === selectedRequestId) ?? null,
    [items, selectedRequestId]
  );

  const selectedDoctorIdFor = useCallback(
    (request) => {
      const raw = doctorSelections[request.id] ?? request.doctorProfileId ?? "";
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    },
    [doctorSelections]
  );

  const selectedDoctorFor = useCallback(
    (request) => {
      const selected = selectedDoctors[request.id];
      if (selected) return selected;
      return request.doctorProfileId && request.doctorName
        ? { id: request.doctorProfileId, fullName: request.doctorName }
        : null;
    },
    [selectedDoctors]
  );

  const updateStatus = async (request, nextStatus, options = {}) => {
    if (!request || !canManageStatus || mutatingId != null) return;
    const doctorProfileId = selectedDoctorIdFor(request);
    if (nextStatus === APPOINTMENT_REQUEST_STATUS.CONFIRMED && !doctorProfileId) {
      showToast("Assign a doctor before confirming this request.", "warning");
      return;
    }
    const scheduledStart = options.scheduledStart ?? scheduledStarts[request.id] ?? `${request.preferredDate}T09:00`;
    const isRescheduleConfirmation =
      options.isRescheduleConfirmation ?? Boolean(rescheduleConfirmations[request.id]);

    setMutatingId(request.id);
    try {
      const updated = await patchAppointmentRequestStatus(
        request.id,
        nextStatus,
        doctorProfileId,
        nextStatus === APPOINTMENT_REQUEST_STATUS.CANCELLED ? null : scheduledStart,
        options.rejectionReason,
        isRescheduleConfirmation
      );
      if (updated.emailNotificationSent === true) {
        showToast(
          isRescheduleConfirmation
            ? "Request confirmed and reschedule email sent."
            : "Request updated and confirmation email sent."
        );
      } else {
        showToast(
          isRescheduleConfirmation
            ? "Request confirmed, but the reschedule email could not be sent."
            : "Request updated, but the confirmation email could not be sent.",
          "warning"
        );
      }
      if (nextStatus === APPOINTMENT_REQUEST_STATUS.CONFIRMED || nextStatus === APPOINTMENT_REQUEST_STATUS.CANCELLED) {
        setSelectedRequestId(null);
      }
      setPendingAction(null);
      setRejectionReason("");
      setRescheduleConfirmations((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setMutatingId(null);
    }
  };

  const updateAppointmentStatus = async (request, nextStatus) => {
    if (!request?.appointmentId || !canManageStatus || mutatingId != null) return;
    setMutatingId(request.id);
    try {
      await patchAppointmentStatus(request.appointmentId, {
        status: nextStatus,
        ...(nextStatus === APPOINTMENT_STATUS.CANCELLED
          ? { cancellationReason: "Cancelled by reception" }
          : {}),
      });
      showToast(nextStatus === APPOINTMENT_STATUS.CHECKED_IN ? "Patient checked in." : "Appointment cancelled.");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setMutatingId(null);
    }
  };

  const updateDoctorSelection = (requestId, nextValue, doctor) => {
    setDoctorSelections((current) => ({
      ...current,
      [requestId]: nextValue,
    }));
    setSelectedDoctors((current) => {
      const next = { ...current };
      if (doctor) {
        next[requestId] = doctor;
      } else {
        delete next[requestId];
      }
      return next;
    });
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

      <div className="appointment-content-frame min-h-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 p-2 sm:p-3">
        <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Online requests</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {pagination?.totalCount ?? items.length} matching request{(pagination?.totalCount ?? items.length) === 1 ? "" : "s"}
            </p>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
                Loading requests...
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[16rem] items-center justify-center p-6 text-center">
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
              <div className="space-y-3">
                {items.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    selected={request.id === selectedRequestId}
                    onSelect={() => setSelectedRequestId(request.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
        </section>
      </div>

      <RequestDetailsModal
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequestId(null)}
      >
        {selectedRequest && (
          <RequestDetails
            request={selectedRequest}
            canManageStatus={canManageStatus}
            mutating={selectedRequest ? mutatingId === selectedRequest.id : false}
            doctorSelection={
              selectedRequest ? doctorSelections[selectedRequest.id] : undefined
            }
            selectedDoctor={
              selectedRequest ? selectedDoctorFor(selectedRequest) : null
            }
            scheduledStart={
              scheduledStarts[selectedRequest.id] ||
              (selectedRequest.scheduledStart
                ? String(selectedRequest.scheduledStart).slice(0, 16)
                : `${selectedRequest.preferredDate}T09:00`)
            }
            isReschedulePending={Boolean(rescheduleConfirmations[selectedRequest.id])}
            onScheduledStartChange={(value) =>
              setScheduledStarts((current) => ({ ...current, [selectedRequest.id]: value }))
            }
            onDoctorChange={(nextValue, doctor) => {
              if (selectedRequest) updateDoctorSelection(selectedRequest.id, nextValue, doctor);
            }}
            onStatusChange={(nextStatus) => {
              if (selectedRequest) void updateStatus(selectedRequest, nextStatus);
            }}
            onOpenAction={(nextAction) => {
              setPendingAction(nextAction);
              setRescheduleDraft("");
            }}
            onAppointmentStatusChange={(nextStatus) => {
              if (selectedRequest) void updateAppointmentStatus(selectedRequest, nextStatus);
            }}
          />
        )}
      </RequestDetailsModal>

      <RequestActionModal
        action={pendingAction}
        request={selectedRequest}
        rescheduleDraft={rescheduleDraft}
        rejectionReason={rejectionReason}
        mutating={selectedRequest ? mutatingId === selectedRequest.id : false}
        onRescheduleDraftChange={setRescheduleDraft}
        onRejectionReasonChange={setRejectionReason}
        onClose={() => {
          setPendingAction(null);
          setRescheduleDraft("");
          setRejectionReason("");
        }}
        onSubmit={() => {
          if (selectedRequest && pendingAction) {
            if (pendingAction === APPOINTMENT_REQUEST_STATUS.RESCHEDULED) {
              if (!rescheduleDraft) return;
              setScheduledStarts((current) => ({
                ...current,
                [selectedRequest.id]: rescheduleDraft,
              }));
              setRescheduleConfirmations((current) => ({
                ...current,
                [selectedRequest.id]: true,
              }));
              setPendingAction(null);
              setRescheduleDraft("");
              showToast("New time selected. Assign a doctor and confirm the request to notify the patient.");
              return;
            }
            void updateStatus(selectedRequest, pendingAction, {
              rejectionReason,
            });
          }
        }}
      />
    </div>
  );
}
