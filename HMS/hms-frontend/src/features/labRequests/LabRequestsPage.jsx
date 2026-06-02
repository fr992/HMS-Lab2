import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Beaker,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  Printer,
  RefreshCw,
  Search,
  TestTube2,
  XCircle,
} from "lucide-react";
import {
  fetchLabRequests,
  getApiErrorMessage,
  LAB_REQUEST_STATUS,
} from "@/features/labRequests/api/labRequestsApi";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";
import { printLabRequestSummaryPdf } from "@/lib/pdfPrint";
import DataTransferMenu from "@/features/dataTransfer/DataTransferMenu";

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

function SummaryTile({ label, value, icon, loading = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {loading ? (
          <span className="block h-8 w-20 animate-pulse rounded bg-slate-200" />
        ) : (
          <CountUpValue value={value} />
        )}
      </p>
    </div>
  );
}

function RowActions({ request, onView }) {
  return (
    <div className="relative flex justify-end gap-2">
      <button
        type="button"
        onClick={() => onView(request)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        <FileText className="h-4 w-4" aria-hidden />
        Manage Results
      </button>
    </div>
  );
}

export default function LabRequestsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

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

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => items.some((item) => String(item.id) === String(id)))
    );
  }, [items]);

  const filteredItems = items;
  const selectedRequests = useMemo(
    () => filteredItems.filter((item) => selectedIds.includes(String(item.id))),
    [filteredItems, selectedIds]
  );
  const allVisibleSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

  function toggleRequest(id) {
    const key = String(id);
    setSelectedIds((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  function toggleVisible() {
    setSelectedIds(allVisibleSelected ? [] : filteredItems.map((item) => String(item.id)));
  }

  function handlePrintSelectedRequests() {
    const ok = printLabRequestSummaryPdf(selectedRequests);
    if (!ok) {
      setError("Your browser blocked the PDF window. Please allow pop-ups for this app and try again.");
    }
  }

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Laboratory workflow
          </p>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Review ordered tests and move requests through the lab status flow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DataTransferMenu
            endpoint="/data-transfer/lab-requests"
            exportParams={{
              status: statusFilter === "all" ? undefined : statusFilter,
              search: search.trim() || undefined,
            }}
            canImport={false}
          />
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
          loading={loading}
          icon={<Beaker className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Requested"
          value={counts.requested}
          loading={loading}
          icon={<Clock3 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Active"
          value={counts.sample_collected + counts.in_progress}
          loading={loading}
          icon={<FlaskConical className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Closed"
          value={counts.completed + counts.cancelled}
          loading={loading}
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

      {error && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {selectedIds.length > 0 && !loading && (
          <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-slate-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">
              {selectedIds.length} lab request{selectedIds.length === 1 ? "" : "s"} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrintSelectedRequests}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
              >
                <Printer className="h-4 w-4" aria-hidden />
                PDF selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="h-9 rounded-lg border border-sky-200 bg-white px-3 text-sm font-medium text-sky-900 shadow-sm transition hover:bg-sky-100"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid animate-pulse gap-3 rounded-lg border border-slate-100 p-3 md:grid-cols-[2rem_1fr_1fr_7rem_7rem_8rem]">
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-200" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-200" />
              </div>
            ))}
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
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisible}
                    aria-label="Select all visible lab requests"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </th>
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
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(String(request.id))}
                      onChange={() => toggleRequest(request.id)}
                      aria-label={`Select lab request ${request.requestNumber || request.id}`}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                  </td>
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
                      onView={(item) =>
                        navigate(
                          `/lab-requests/${encodeURIComponent(item.requestNumber)}/${item.id}`,
                          { state: { request: item } }
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>

    </div>
  );
}
