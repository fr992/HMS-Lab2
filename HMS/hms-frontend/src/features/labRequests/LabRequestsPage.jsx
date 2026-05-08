import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beaker,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  MoreVertical,
  RefreshCw,
  Search,
  TestTube2,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  fetchLabRequests,
  getApiErrorMessage,
  LAB_REQUEST_STATUS,
  updateLabRequestStatus,
} from "@/features/labRequests/api/labRequestsApi";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: LAB_REQUEST_STATUS.REQUESTED, label: "Requested" },
  { value: LAB_REQUEST_STATUS.SAMPLE_COLLECTED, label: "Sample collected" },
  { value: LAB_REQUEST_STATUS.IN_PROGRESS, label: "In progress" },
  { value: LAB_REQUEST_STATUS.COMPLETED, label: "Completed" },
  { value: LAB_REQUEST_STATUS.CANCELLED, label: "Cancelled" },
];

const STATUS_META = {
  requested: {
    label: "Requested",
    icon: Clock3,
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
  },
  sample_collected: {
    label: "Sample collected",
    icon: TestTube2,
    badge: "bg-sky-50 text-sky-900 ring-sky-200",
  },
  in_progress: {
    label: "In progress",
    icon: FlaskConical,
    badge: "bg-indigo-50 text-indigo-900 ring-indigo-200",
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

const PRIORITY_META = {
  routine: "bg-slate-100 text-slate-700 ring-slate-200",
  urgent: "bg-orange-50 text-orange-900 ring-orange-200",
  stat: "bg-rose-50 text-rose-900 ring-rose-200",
};

function statusKey(status) {
  return String(status ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function LabRequestStatusBadge({ status }) {
  const key = statusKey(status);
  const meta = STATUS_META[key] ?? {
    label: titleCase(status) || "Unknown",
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

function PriorityBadge({ priority }) {
  const key = statusKey(priority);
  const className =
    PRIORITY_META[key] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {titleCase(priority) || "-"}
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
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function getNextStatuses(status) {
  const key = statusKey(status);
  if (key === LAB_REQUEST_STATUS.REQUESTED) {
    return [
      { label: "Mark sample collected", status: LAB_REQUEST_STATUS.SAMPLE_COLLECTED },
      { label: "Cancel", status: LAB_REQUEST_STATUS.CANCELLED, danger: true },
    ];
  }
  if (key === LAB_REQUEST_STATUS.SAMPLE_COLLECTED) {
    return [
      { label: "Start processing", status: LAB_REQUEST_STATUS.IN_PROGRESS },
      { label: "Cancel", status: LAB_REQUEST_STATUS.CANCELLED, danger: true },
    ];
  }
  if (key === LAB_REQUEST_STATUS.IN_PROGRESS) {
    return [
      { label: "Complete", status: LAB_REQUEST_STATUS.COMPLETED },
      { label: "Cancel", status: LAB_REQUEST_STATUS.CANCELLED, danger: true },
    ];
  }
  return [];
}

function RequestItemsModal({
  request,
  canUpdateStatus,
  mutating,
  onClose,
  onStatus,
}) {
  const requestId = request?.id;
  const requestStatus = request?.status;
  const statusActions = useMemo(
    () => (canUpdateStatus && requestStatus ? getNextStatuses(requestStatus) : []),
    [canUpdateStatus, requestStatus]
  );
  const [nextStatus, setNextStatus] = useState("");

  useEffect(() => {
    setNextStatus(statusActions[0]?.status ?? "");
  }, [requestId, requestStatus, statusActions]);

  if (!request) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-request-modal-title"
    >
      <section className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lab request
            </p>
            <h2
              id="lab-request-modal-title"
              className="mt-1 truncate text-lg font-semibold text-slate-950"
            >
              {request.requestNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {request.patientName} - {request.requestedByDoctorName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Close lab request details"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile label="Priority" value={titleCase(request.priority) || "-"} />
            <InfoTile
              label="Status"
              value={STATUS_META[statusKey(request.status)]?.label ?? titleCase(request.status)}
            />
            <InfoTile label="Requested" value={formatDateTime(request.requestedAt)} />
            <InfoTile label="Completed" value={formatDateTime(request.completedAt)} />
          </div>

          {request.clinicalNotes && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Clinical notes
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {request.clinicalNotes}
              </p>
            </div>
          )}

          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current status
                </p>
                <div className="mt-2">
                  <LabRequestStatusBadge status={request.status} />
                </div>
              </div>

              {canUpdateStatus && statusActions.length > 0 ? (
                <form
                  className="grid gap-3 sm:grid-cols-[minmax(12rem,16rem)_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!nextStatus || mutating) return;
                    void onStatus(request, nextStatus);
                  }}
                >
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Change status
                    </span>
                    <select
                      value={nextStatus}
                      onChange={(event) => setNextStatus(event.target.value)}
                      disabled={mutating}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60"
                    >
                      {statusActions.map((action) => (
                        <option key={action.status} value={action.status}>
                          {action.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={mutating || !nextStatus}
                    className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                  >
                    {mutating ? "Saving..." : "Update status"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">
                  {canUpdateStatus
                    ? "No status changes are available for this request."
                    : "You do not have permission to change this status."}
                </p>
              )}
            </div>
          </section>

          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Specimen</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(request.items ?? []).map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 text-slate-600">{item.testCode || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.testName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.specimenType || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <LabRequestStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.notes || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {Array.isArray(item.results) && item.results.length > 0
                        ? item.results.length
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}

function RowActions({
  request,
  canUpdateStatus,
  mutatingId,
  openMenuId,
  onMenuToggle,
  onView,
  onStatus,
}) {
  const actions = canUpdateStatus ? getNextStatuses(request.status) : [];
  const isOpen = openMenuId === request.id;
  const busy = mutatingId === request.id;

  return (
    <div className="relative flex justify-end gap-2">
      <button
        type="button"
        onClick={() => onView(request)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        <FileText className="h-4 w-4" aria-hidden />
        View
      </button>
      {actions.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => onMenuToggle(isOpen ? null : request.id)}
            disabled={mutatingId != null}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="More lab request actions"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </button>
          {isOpen && (
            <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-slate-200 bg-white py-1.5 shadow-xl">
              {actions.map((action) => (
                <button
                  key={action.status}
                  type="button"
                  disabled={mutatingId != null}
                  onClick={() => onStatus(request, action.status)}
                  className={
                    action.danger
                      ? "w-full px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      : "w-full px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
                  }
                >
                  {busy ? "Saving..." : action.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LabRequestsPage() {
  const auth = useAuth();
  const canUpdateStatus = auth.hasPermission("LabRequests.UpdateStatus");

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLabRequests({
        status: statusFilter,
        search: search.trim() || undefined,
        page,
        pageSize: 25,
      });
      setItems(getPagedItems(data));
      setPagination(getPagination(data));
    } catch (e) {
      setError(getApiErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search, page]);

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

  const filteredItems = items;

  const counts = useMemo(() => {
    const next = {
      total: items.length,
      requested: 0,
      sample_collected: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const item of items) {
      const key = statusKey(item.status);
      if (key in next) next[key] += 1;
    }
    return next;
  }, [items]);

  async function handleStatusUpdate(request, nextStatus) {
    if (!canUpdateStatus || mutatingId != null) return;
    setMutatingId(request.id);
    setOpenMenuId(null);
    try {
      const updated = await updateLabRequestStatus(request.id, nextStatus);
      setSelectedRequest((current) =>
        current?.id === updated.id ? updated : current
      );
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      showToast("Lab request status updated.");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Laboratory workflow
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Lab Requests
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Review ordered tests and move requests through the lab status flow.
          </p>
        </div>

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Total"
          value={counts.total}
          icon={<Beaker className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Requested"
          value={counts.requested}
          icon={<Clock3 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Active"
          value={counts.sample_collected + counts.in_progress}
          icon={<FlaskConical className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Closed"
          value={counts.completed + counts.cancelled}
          icon={<CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <span className="relative mt-1.5 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Request, patient, doctor, priority"
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
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPage(1);
              setStatusFilter("all");
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Clear
          </button>
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

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
            Loading lab requests...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center p-8 text-center">
            <div>
              <Beaker className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-900">
                No lab requests found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjust filters or refresh after new encounter requests.
              </p>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Request Number</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.map((request) => (
                <tr key={request.id} className="align-top transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {request.requestNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{request.patientName}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {request.requestedByDoctorName}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={request.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <LabRequestStatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(request.requestedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      request={request}
                      canUpdateStatus={canUpdateStatus}
                      mutatingId={mutatingId}
                      openMenuId={openMenuId}
                      onMenuToggle={setOpenMenuId}
                      onView={setSelectedRequest}
                      onStatus={handleStatusUpdate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>

      <RequestItemsModal
        request={selectedRequest}
        canUpdateStatus={canUpdateStatus}
        mutating={mutatingId === selectedRequest?.id}
        onClose={() => setSelectedRequest(null)}
        onStatus={handleStatusUpdate}
      />
    </div>
  );
}
