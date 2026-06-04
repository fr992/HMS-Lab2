import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Filter,
  FlaskConical,
  ListFilter,
  RefreshCw,
  Search,
  ShieldAlert,
  TestTube2,
  XCircle,
} from "lucide-react";
import {
  fetchStaffOverviewData,
  getOverviewItems,
  getOverviewTotal,
} from "@/features/staffOverview/api/overviewApi";
import { keyOf } from "@/features/dashboard/dashboardUtils";

const WORKSTREAM_OPTIONS = [
  { value: "priority", label: "Priority queue", icon: ListFilter },
  { value: "payments", label: "Payments", icon: CreditCard },
  { value: "lab_requests", label: "Lab requests", icon: TestTube2 },
  { value: "lab_results", label: "Lab results", icon: FlaskConical },
  { value: "nurse_tasks", label: "Nurse tasks", icon: ClipboardCheck },
];

function formatDateTime(value, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function latestDate(item, keys) {
  for (const key of keys) {
    const date = new Date(item?.[key]);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(0);
}

function sortRecent(items, keys) {
  return [...items].sort((a, b) => latestDate(b, keys) - latestDate(a, keys));
}

function alertStyle(type) {
  const normalized = keyOf(type);
  if (normalized === "success") {
    return { icon: CheckCircle2, classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  }
  if (normalized === "error") {
    return { icon: AlertTriangle, classes: "bg-rose-50 text-rose-700 ring-rose-200" };
  }
  if (normalized === "warning") {
    return { icon: AlertTriangle, classes: "bg-amber-50 text-amber-700 ring-amber-200" };
  }
  return { icon: Bell, classes: "bg-sky-50 text-sky-700 ring-sky-200" };
}

function statusClasses(status) {
  const normalized = keyOf(status);
  if (["paid", "completed", "published"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  if (["pending", "requested", "sample_collected"].includes(normalized)) {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  if (normalized === "in_progress") {
    return "bg-sky-50 text-sky-800 ring-sky-200";
  }
  if (["failed", "cancelled", "canceled", "overdue", "draft"].includes(normalized)) {
    return "bg-rose-50 text-rose-800 ring-rose-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function titleCase(value) {
  return String(value || "Unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isClosedTask(task) {
  return ["completed", "cancelled", "canceled"].includes(keyOf(task.status));
}

function dateBound(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function textMatches(value, query) {
  if (!query) return true;
  return String(value || "").toLowerCase().includes(query);
}

function filterItems(items, filters, getText, getDate) {
  const query = filters.search.trim().toLowerCase();
  const from = dateBound(filters.fromDate);
  const to = dateBound(filters.toDate, true);

  return items.filter((item) => {
    if (!textMatches(getText(item), query)) return false;

    if (from || to) {
      const date = getDate(item);
      if (!(date instanceof Date) || Number.isNaN(date.getTime()) || date.getTime() === 0) {
        return false;
      }
      if (from && date < from) return false;
      if (to && date > to) return false;
    }

    return true;
  });
}

function paymentText(payment) {
  return [
    payment.invoiceNumber,
    payment.invoiceId,
    payment.status,
    payment.paymentMethod,
    payment.receivedByUserName,
    payment.transactionReference,
    payment.amount,
  ].join(" ");
}

function labRequestText(request) {
  return [
    request.requestNumber,
    request.patientName,
    request.requestedByDoctorName,
    request.priority,
    request.status,
  ].join(" ");
}

function labResultText(result) {
  return [
    result.testName,
    result.patientName,
    result.requestNumber,
    result.resultData,
    result.verifiedAt ? "published" : "draft",
  ].join(" ");
}

function taskText(task) {
  return [
    task.type,
    task.status,
    task.patientName,
    task.assignedToNurseName,
    task.assignedByDoctorName,
  ].join(" ");
}

function priorityText(item) {
  return [item.type, item.title, item.detail, item.status].join(" ");
}

function getStatusOptions(workstream, counts) {
  if (workstream === "payments") {
    return [
      { value: "all", label: `All payments (${counts.totalPayments})` },
      { value: "pending", label: `Pending (${counts.pendingPayments})` },
      { value: "paid", label: `Paid (${counts.paidPayments})` },
      { value: "exceptions", label: `Failed / cancelled (${counts.failedPayments})` },
    ];
  }
  if (workstream === "lab_requests") {
    return [
      { value: "all", label: `All lab requests (${counts.totalLabRequests})` },
      { value: "requested", label: `Requested (${counts.requestedLabRequests})` },
      { value: "active", label: `Active (${counts.activeLabRequests})` },
      { value: "completed", label: `Completed (${counts.completedLabRequests})` },
    ];
  }
  if (workstream === "lab_results") {
    return [
      { value: "all", label: `All lab results (${counts.totalLabResults})` },
      { value: "draft", label: `Draft (${counts.draftLabResults})` },
      { value: "published", label: `Published (${counts.publishedLabResults})` },
    ];
  }
  if (workstream === "nurse_tasks") {
    return [
      { value: "all", label: `All tasks (${counts.totalNurseTasks})` },
      { value: "open", label: `Open (${counts.activeNurseTasks})` },
      { value: "completed", label: `Completed (${counts.completedNurseTasks})` },
    ];
  }
  return [{ value: "all", label: `Open priority work (${counts.priority})` }];
}

function getActiveError(filters, overview) {
  if (!overview) return "";

  if (filters.workstream === "payments") {
    if (filters.status === "pending") return overview.paymentsPending?.ok === false ? overview.paymentsPending.error : "";
    if (filters.status === "paid") return overview.paymentsPaid?.ok === false ? overview.paymentsPaid.error : "";
    if (filters.status === "exceptions") {
      return overview.paymentsFailed?.ok === false
        ? overview.paymentsFailed.error
        : overview.paymentsCancelled?.ok === false
          ? overview.paymentsCancelled.error
          : "";
    }
    return overview.paymentsAll?.ok === false ? overview.paymentsAll.error : "";
  }

  if (filters.workstream === "lab_requests") {
    if (filters.status === "requested") {
      return overview.labRequestsRequested?.ok === false ? overview.labRequestsRequested.error : "";
    }
    if (filters.status === "active") {
      return overview.labRequestsSampleCollected?.ok === false
        ? overview.labRequestsSampleCollected.error
        : overview.labRequestsInProgress?.ok === false
          ? overview.labRequestsInProgress.error
          : "";
    }
    if (filters.status === "completed") {
      return overview.labRequestsCompleted?.ok === false ? overview.labRequestsCompleted.error : "";
    }
    return overview.labRequests?.ok === false ? overview.labRequests.error : "";
  }

  if (filters.workstream === "lab_results") {
    return overview.labResults?.ok === false ? overview.labResults.error : "";
  }

  if (filters.workstream === "nurse_tasks") {
    return overview.nurseTasks?.ok === false ? overview.nurseTasks.error : "";
  }

  return "";
}

export default function OverviewPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({
    workstream: "priority",
    status: "all",
    search: "",
    fromDate: "",
    toDate: "",
  });

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchStaffOverviewData();
      setOverview(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => {
      void load({ quiet: true });
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  const alerts = getOverviewItems(overview?.alerts?.data);
  const nurseTasks = useMemo(
    () =>
      sortRecent(getOverviewItems(overview?.nurseTasks?.data), [
        "dueAt",
        "updatedAt",
        "createdAt",
      ]),
    [overview]
  );
  const activeNurseTasks = useMemo(
    () => nurseTasks.filter((task) => !isClosedTask(task)),
    [nurseTasks]
  );
  const completedNurseTasks = useMemo(
    () => nurseTasks.filter((task) => keyOf(task.status) === "completed"),
    [nurseTasks]
  );

  const allPayments = useMemo(
    () => sortRecent(getOverviewItems(overview?.paymentsAll?.data), ["paidAt", "updatedAt", "createdAt"]),
    [overview]
  );
  const pendingPayments = useMemo(
    () => sortRecent(getOverviewItems(overview?.paymentsPending?.data), ["paidAt", "updatedAt", "createdAt"]),
    [overview]
  );
  const paidPayments = useMemo(
    () => sortRecent(getOverviewItems(overview?.paymentsPaid?.data), ["paidAt", "updatedAt", "createdAt"]),
    [overview]
  );
  const failedPayments = useMemo(
    () =>
      sortRecent(
        [
          ...getOverviewItems(overview?.paymentsFailed?.data),
          ...getOverviewItems(overview?.paymentsCancelled?.data),
        ],
        ["paidAt", "updatedAt", "createdAt"]
      ),
    [overview]
  );

  const allLabRequests = useMemo(
    () => sortRecent(getOverviewItems(overview?.labRequests?.data), ["requestedAt", "updatedAt", "createdAt"]),
    [overview]
  );
  const requestedLabRequests = useMemo(
    () => sortRecent(getOverviewItems(overview?.labRequestsRequested?.data), ["requestedAt", "createdAt"]),
    [overview]
  );
  const activeLabRequests = useMemo(
    () =>
      sortRecent(
        [
          ...getOverviewItems(overview?.labRequestsSampleCollected?.data),
          ...getOverviewItems(overview?.labRequestsInProgress?.data),
        ],
        ["requestedAt", "updatedAt", "createdAt"]
      ),
    [overview]
  );
  const completedLabRequests = useMemo(
    () => sortRecent(getOverviewItems(overview?.labRequestsCompleted?.data), ["requestedAt", "updatedAt", "createdAt"]),
    [overview]
  );

  const labResults = useMemo(
    () =>
      sortRecent(getOverviewItems(overview?.labResults?.data), [
        "verifiedAt",
        "updatedAt",
        "createdAt",
      ]),
    [overview]
  );
  const draftLabResults = useMemo(
    () => labResults.filter((result) => !result.verifiedAt),
    [labResults]
  );
  const publishedLabResults = useMemo(
    () => labResults.filter((result) => result.verifiedAt),
    [labResults]
  );

  const counts = useMemo(() => {
    const next = {
      totalPayments: getOverviewTotal(overview?.paymentsAll?.data),
      pendingPayments: getOverviewTotal(overview?.paymentsPending?.data),
      paidPayments: getOverviewTotal(overview?.paymentsPaid?.data),
      failedPayments:
        getOverviewTotal(overview?.paymentsFailed?.data) +
        getOverviewTotal(overview?.paymentsCancelled?.data),
      totalLabRequests: getOverviewTotal(overview?.labRequests?.data),
      requestedLabRequests: getOverviewTotal(overview?.labRequestsRequested?.data),
      activeLabRequests:
        getOverviewTotal(overview?.labRequestsSampleCollected?.data) +
        getOverviewTotal(overview?.labRequestsInProgress?.data),
      completedLabRequests: getOverviewTotal(overview?.labRequestsCompleted?.data),
      totalLabResults: labResults.length,
      draftLabResults: draftLabResults.length,
      publishedLabResults: publishedLabResults.length,
      totalNurseTasks: nurseTasks.length,
      activeNurseTasks: activeNurseTasks.length,
      completedNurseTasks: completedNurseTasks.length,
    };

    next.priority =
      next.pendingPayments +
      next.requestedLabRequests +
      next.activeLabRequests +
      next.draftLabResults +
      next.activeNurseTasks;

    return next;
  }, [
    activeNurseTasks.length,
    completedNurseTasks.length,
    draftLabResults.length,
    labResults.length,
    nurseTasks.length,
    overview,
    publishedLabResults.length,
  ]);

  const statusOptions = useMemo(
    () => getStatusOptions(filters.workstream, counts),
    [counts, filters.workstream]
  );

  const priorityItems = useMemo(
    () =>
      [
        ...pendingPayments.map((payment) => ({
          id: `payment-${payment.id}`,
          type: "Payment",
          icon: CreditCard,
          title: payment.invoiceNumber || `Invoice #${payment.invoiceId}`,
          detail: [payment.receivedByUserName, formatMoney(payment.amount)].filter(Boolean).join(" - "),
          status: payment.status || "pending",
          time: payment.createdAt || payment.updatedAt,
        })),
        ...requestedLabRequests.map((request) => ({
          id: `lab-requested-${request.id}`,
          type: "Lab request",
          icon: TestTube2,
          title: request.requestNumber || `Request #${request.id}`,
          detail: [request.patientName, request.requestedByDoctorName].filter(Boolean).join(" - "),
          status: request.status || "requested",
          time: request.requestedAt || request.createdAt,
        })),
        ...activeLabRequests.map((request) => ({
          id: `lab-active-${request.id}`,
          type: "Lab request",
          icon: FlaskConical,
          title: request.requestNumber || `Request #${request.id}`,
          detail: [request.patientName, titleCase(request.priority || "normal")].filter(Boolean).join(" - "),
          status: request.status,
          time: request.requestedAt || request.updatedAt || request.createdAt,
        })),
        ...draftLabResults.map((result) => ({
          id: `lab-result-${result.id}`,
          type: "Lab result",
          icon: AlertTriangle,
          title: result.testName || "Lab result",
          detail: [result.patientName, result.requestNumber].filter(Boolean).join(" - "),
          status: "Draft",
          time: result.updatedAt || result.createdAt,
        })),
        ...activeNurseTasks.map((task) => ({
          id: `task-${task.id}`,
          type: "Nurse task",
          icon: ClipboardCheck,
          title: titleCase(task.type),
          detail: [task.patientName, task.assignedToNurseName].filter(Boolean).join(" - "),
          status: task.status,
          time: task.dueAt || task.updatedAt || task.createdAt,
        })),
      ].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)),
    [activeLabRequests, activeNurseTasks, draftLabResults, pendingPayments, requestedLabRequests]
  );

  const activeView = useMemo(() => {
    const workstreamMeta =
      WORKSTREAM_OPTIONS.find((option) => option.value === filters.workstream) ?? WORKSTREAM_OPTIONS[0];

    if (filters.workstream === "payments") {
      const source =
        filters.status === "pending"
          ? pendingPayments
          : filters.status === "paid"
            ? paidPayments
            : filters.status === "exceptions"
              ? failedPayments
              : allPayments;

      return {
        type: "payments",
        title: workstreamMeta.label,
        icon: workstreamMeta.icon,
        items: filterItems(
          source,
          filters,
          paymentText,
          (payment) => latestDate(payment, ["paidAt", "updatedAt", "createdAt"])
        ),
      };
    }

    if (filters.workstream === "lab_requests") {
      const source =
        filters.status === "requested"
          ? requestedLabRequests
          : filters.status === "active"
            ? activeLabRequests
            : filters.status === "completed"
              ? completedLabRequests
              : allLabRequests;

      return {
        type: "lab_requests",
        title: workstreamMeta.label,
        icon: workstreamMeta.icon,
        items: filterItems(
          source,
          filters,
          labRequestText,
          (request) => latestDate(request, ["requestedAt", "updatedAt", "createdAt"])
        ),
      };
    }

    if (filters.workstream === "lab_results") {
      const source =
        filters.status === "draft"
          ? draftLabResults
          : filters.status === "published"
            ? publishedLabResults
            : labResults;

      return {
        type: "lab_results",
        title: workstreamMeta.label,
        icon: workstreamMeta.icon,
        items: filterItems(
          source,
          filters,
          labResultText,
          (result) => latestDate(result, ["verifiedAt", "updatedAt", "createdAt"])
        ),
      };
    }

    if (filters.workstream === "nurse_tasks") {
      const source =
        filters.status === "open"
          ? activeNurseTasks
          : filters.status === "completed"
            ? completedNurseTasks
            : nurseTasks;

      return {
        type: "nurse_tasks",
        title: workstreamMeta.label,
        icon: workstreamMeta.icon,
        items: filterItems(
          source,
          filters,
          taskText,
          (task) => latestDate(task, ["dueAt", "updatedAt", "createdAt"])
        ),
      };
    }

    return {
      type: "priority",
      title: workstreamMeta.label,
      icon: workstreamMeta.icon,
      items: filterItems(
        priorityItems,
        filters,
        priorityText,
        (item) => latestDate(item, ["time"])
      ),
    };
  }, [
    activeLabRequests,
    activeNurseTasks,
    allLabRequests,
    allPayments,
    completedLabRequests,
    completedNurseTasks,
    draftLabResults,
    failedPayments,
    filters,
    labResults,
    nurseTasks,
    paidPayments,
    pendingPayments,
    priorityItems,
    publishedLabResults,
    requestedLabRequests,
  ]);

  const activeError = getActiveError(filters, overview);
  const ActiveIcon = activeView.icon;
  const summaryStats = [
    { label: "Priority queue", value: counts.priority, icon: ListFilter },
    { label: "Pending payments", value: counts.pendingPayments, icon: CreditCard },
    { label: "Requested labs", value: counts.requestedLabRequests, icon: TestTube2 },
    { label: "Active labs", value: counts.activeLabRequests, icon: FlaskConical },
    { label: "Draft results", value: counts.draftLabResults, icon: AlertTriangle },
  ];

  function updateFilter(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function handleWorkstreamChange(value) {
    setFilters((current) => ({
      ...current,
      workstream: value,
      status: "all",
    }));
  }

  function clearFilters() {
    setFilters({
      workstream: "priority",
      status: "all",
      search: "",
      fromDate: "",
      toDate: "",
    });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 overflow-visible">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Staff Overview
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
            Track staff-facing work across payments, lab requests, lab results, nurse tasks, and alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm">
            <Clock3 className="size-4 text-slate-400" aria-hidden />
            {lastUpdated ? `Updated ${formatDateTime(lastUpdated)}` : "Waiting for data"}
          </span>
          <button
            type="button"
            onClick={() => void load({ quiet: true })}
            disabled={refreshing || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryStats.map((stat) => (
          <SummaryStat key={stat.label} stat={stat} loading={loading} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Filter className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Filters</h2>
            <p className="text-xs font-medium text-slate-500">
              Narrow the overview by workflow, status, text, or date.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,12rem)_minmax(0,14rem)_minmax(0,1fr)_minmax(0,9.5rem)_minmax(0,9.5rem)_auto] xl:items-end">
          <SelectField
            label="Workflow"
            value={filters.workstream}
            options={WORKSTREAM_OPTIONS}
            onChange={handleWorkstreamChange}
          />
          <SelectField
            label="Status"
            value={filters.status}
            options={statusOptions}
            onChange={(value) => updateFilter({ status: value })}
          />
          <SearchField
            value={filters.search}
            onChange={(value) => updateFilter({ search: value })}
          />
          <DateField
            label="From"
            value={filters.fromDate}
            onChange={(value) => updateFilter({ fromDate: value })}
          />
          <DateField
            label="To"
            value={filters.toDate}
            onChange={(value) => updateFilter({ toDate: value })}
          />
          <button
            type="button"
            onClick={clearFilters}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 sm:col-span-2 xl:col-span-1 xl:w-auto"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="grid min-h-112 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
        <Panel
          title={activeView.title}
          icon={<ActiveIcon className="size-4" aria-hidden />}
          count={activeView.items.length}
          error={activeError}
        >
          {loading ? (
            <LoadingRows />
          ) : (
            <FilteredContent view={activeView} />
          )}
        </Panel>

        <Panel
          title="Live Alerts"
          icon={<Bell className="size-4" aria-hidden />}
          count={alerts.length}
          error={overview?.alerts?.ok === false ? overview.alerts.error : ""}
        >
          {loading ? (
            <LoadingRows />
          ) : alerts.length === 0 ? (
            <EmptyState label="No live alerts right now." />
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 12).map((alert, index) => (
                <AlertRow key={`${alert.title}-${index}`} alert={alert} />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function SummaryStat({ stat, loading }) {
  const Icon = stat.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-slate-600">{stat.label}</p>
        <Icon className="size-4 shrink-0 text-slate-400" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950">
        {loading ? "-" : stat.value}
      </p>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchField({ value, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Search
      </span>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Patient, request, invoice, staff"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
      </span>
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative block">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      </span>
    </label>
  );
}

function Panel({ title, icon, count, error, children }) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </span>
          <h2 className="truncate text-sm font-semibold text-slate-950">{title}</h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {Number.isFinite(count) && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {count}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
              <ShieldAlert className="size-3" aria-hidden />
              Unavailable
            </span>
          )}
        </div>
      </div>
      {error && <p className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-800">{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

function FilteredContent({ view }) {
  if (view.type === "payments") {
    return <PaymentList items={view.items} emptyLabel="No payments match these filters." />;
  }
  if (view.type === "lab_requests") {
    return <LabRequestList items={view.items} emptyLabel="No lab requests match these filters." />;
  }
  if (view.type === "lab_results") {
    return <LabResultList items={view.items} emptyLabel="No lab results match these filters." />;
  }
  if (view.type === "nurse_tasks") {
    return <TaskList items={view.items} emptyLabel="No nurse tasks match these filters." />;
  }
  return <PriorityList items={view.items} />;
}

function PriorityList({ items }) {
  if (items.length === 0) {
    return <EmptyState label="No priority work matches these filters." />;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <PriorityRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function PriorityRow({ item }) {
  const Icon = item.icon;

  return (
    <div className="grid min-w-0 gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="flex min-w-0 gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.type}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{item.title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{item.detail || "No details"}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <StatusBadge status={item.status} />
        <span className="text-xs font-medium text-slate-500">{formatDateTime(item.time)}</span>
      </div>
    </div>
  );
}

function PaymentList({ items, emptyLabel }) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((payment) => (
        <PaymentRow key={payment.id} payment={payment} />
      ))}
    </div>
  );
}

function PaymentRow({ payment }) {
  return (
    <div className="grid min-w-0 gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-950">
            {payment.invoiceNumber || `Invoice #${payment.invoiceId}`}
          </p>
          <StatusBadge status={payment.status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {payment.receivedByUserName || payment.paymentMethod || "Recorded by system"}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {keyOf(payment.status) === "paid" ? "Paid" : "Updated"}{" "}
          {formatDateTime(payment.paidAt || payment.updatedAt || payment.createdAt)}
        </p>
      </div>
      <p className="wrap-break-word text-sm font-semibold text-slate-950">
        {formatMoney(payment.amount, payment.currency || "USD")}
      </p>
    </div>
  );
}

function LabRequestList({ items, emptyLabel }) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((request) => (
        <LabRequestRow key={request.id} request={request} />
      ))}
    </div>
  );
}

function LabRequestRow({ request }) {
  return (
    <div className="grid min-w-0 gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-950">
            {request.requestNumber || `Request #${request.id}`}
          </p>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {[request.patientName, request.requestedByDoctorName].filter(Boolean).join(" - ") || "Patient"}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Requested {formatDateTime(request.requestedAt || request.createdAt)}
        </p>
      </div>
      <span className="wrap-break-word text-xs font-semibold uppercase tracking-wide text-slate-500 md:text-right">
        {titleCase(request.priority || "routine")}
      </span>
    </div>
  );
}

function LabResultList({ items, emptyLabel }) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((result) => (
        <LabResultRow key={result.id} result={result} />
      ))}
    </div>
  );
}

function LabResultRow({ result }) {
  return (
    <div className="min-w-0 py-3 first:pt-0 last:pb-0">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{result.testName || "Lab result"}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {[result.patientName, result.requestNumber].filter(Boolean).join(" - ") || "No linked request"}
          </p>
        </div>
        <StatusBadge status={result.verifiedAt ? "Published" : "Draft"} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{result.resultData || "No result data."}</p>
    </div>
  );
}

function TaskList({ items, emptyLabel }) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <div className="min-w-0 py-3 first:pt-0 last:pb-0">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{titleCase(task.type)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {[task.patientName, task.assignedToNurseName].filter(Boolean).join(" - ") || "Unassigned task"}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Due {formatDateTime(task.dueAt, "not scheduled")}
      </p>
    </div>
  );
}

function AlertRow({ alert }) {
  const style = alertStyle(alert.type);
  const Icon = style.icon;

  return (
    <div className="flex min-w-0 gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${style.classes}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{alert.title || "Alert"}</p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{alert.desc || alert.detail || "-"}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{alert.time || "Now"}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(status)}`}>
      {titleCase(status)}
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-lg border border-slate-100 p-3">
          <div className="h-3 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-2.5 w-1/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
      {label}
    </div>
  );
}
