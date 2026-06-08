import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bug,
  Database,
  ExternalLink,
  Flame,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  fetchSystemAuditLogs,
  getApiErrorMessage,
} from "@/features/auditLogs/api/auditLogsApi";
import { SEQ_URL } from "@/config/environment";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";

const LEVEL_OPTIONS = [
  { value: "all", label: "All audit levels" },
  { value: "Information", label: "Information" },
  { value: "Warning", label: "Warning" },
  { value: "Error", label: "Error" },
  { value: "Fatal", label: "Fatal" },
];

const LEVEL_STYLES = {
  Information: "bg-sky-50 text-sky-800 ring-sky-200",
  Warning: "bg-amber-50 text-amber-800 ring-amber-200",
  Error: "bg-rose-50 text-rose-800 ring-rose-200",
  Fatal: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function parseProperties(xml) {
  if (!xml || typeof DOMParser === "undefined") return {};

  try {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const properties = {};
    for (const node of document.querySelectorAll("property")) {
      const key = node.getAttribute("key") || node.getAttribute("name");
      if (key) properties[key] = node.textContent || "";
    }
    return properties;
  } catch {
    return {};
  }
}

export default function AdminAuditLogsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSystemAuditLogs({
        level,
        search: search.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: 30,
      });
      setItems(getPagedItems(data));
      setPagination(getPagination(data));
    } catch (err) {
      setItems([]);
      setPagination(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, level, page, search, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    return items.reduce(
      (totals, item) => {
        totals.visible += 1;
        if (item.level === "Warning") totals.warning += 1;
        if (item.level === "Error") totals.error += 1;
        if (item.level === "Fatal") totals.fatal += 1;
        return totals;
      },
      { visible: 0, warning: 0, error: 0, fatal: 0 }
    );
  }, [items]);

  function resetFilters() {
    setLevel("all");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function openSeq() {
    window.open(SEQ_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </p>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
            Review important audit events stored in SQL Server. Seq keeps the full application log stream.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openSeq}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open Seq
          </button>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <SummaryTile label="Visible Events" value={stats.visible} icon={<Database className="size-4 text-slate-400" aria-hidden />} />
        <SummaryTile label="Warnings" value={stats.warning} icon={<AlertTriangle className="size-4 text-amber-500" aria-hidden />} />
        <SummaryTile label="Errors" value={stats.error} icon={<Bug className="size-4 text-rose-500" aria-hidden />} />
        <SummaryTile label="Fatal" value={stats.fatal} icon={<Flame className="size-4 text-fuchsia-500" aria-hidden />} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_10rem_10rem_10rem_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20">
              <Search className="size-4 text-slate-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Message, exception, source, machine, patient"
                className="h-full min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          <FilterField label="Level">
            <select
              value={level}
              onChange={(event) => {
                setPage(1);
                setLevel(event.target.value);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="From">
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setPage(1);
                setFrom(event.target.value);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </FilterField>

          <FilterField label="To">
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setPage(1);
                setTo(event.target.value);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </FilterField>

          <button
            type="button"
            onClick={resetFilters}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <AuditLogsTable items={items} />
        )}
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>
    </div>
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
      <p className="mt-1 text-xs font-medium text-slate-500">Current page</p>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function AuditLogsTable({ items }) {
  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3">Time</th>
          <th className="px-4 py-3">Level</th>
          <th className="px-4 py-3">Source</th>
          <th className="px-4 py-3">Message</th>
          <th className="px-4 py-3">Context</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {items.map((item) => (
          <AuditLogRow key={item.id} item={item} />
        ))}
      </tbody>
    </table>
  );
}

function AuditLogRow({ item }) {
  const properties = parseProperties(item.properties);
  const source = properties.SourceContext || "-";
  const contextValues = [
    properties.AuditScenario && `Scenario: ${properties.AuditScenario}`,
    properties.PatientId && `Patient: ${properties.PatientId}`,
    properties.ActorUserId && `User: ${properties.ActorUserId}`,
    properties.MachineName && `Machine: ${properties.MachineName}`,
    properties.ThreadId && `Thread: ${properties.ThreadId}`,
  ].filter(Boolean);

  return (
    <tr className="align-top transition hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
        {formatDateTime(item.createdAt)}
      </td>
      <td className="px-4 py-3">
        <LevelBadge level={item.level} />
      </td>
      <td className="max-w-[18rem] px-4 py-3">
        <p className="truncate font-medium text-slate-800" title={source}>
          {source}
        </p>
        <p className="mt-1 text-xs text-slate-500">#{item.id}</p>
      </td>
      <td className="min-w-[22rem] px-4 py-3">
        <p className="font-medium leading-5 text-slate-900">{item.message || item.messageTemplate || "-"}</p>
        {item.exception && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-rose-700">
              Exception
            </summary>
            <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
              {item.exception}
            </pre>
          </details>
        )}
      </td>
      <td className="min-w-[16rem] px-4 py-3">
        {contextValues.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {contextValues.map((value) => (
              <span
                key={value}
                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
              >
                {value}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
    </tr>
  );
}

function LevelBadge({ level }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        LEVEL_STYLES[level] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {level || "Unknown"}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
      Loading audit logs...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[16rem] items-center justify-center p-8 text-center">
      <div>
        <ShieldAlert className="mx-auto size-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">No audit logs found</p>
        <p className="mt-1 text-sm text-slate-500">
          Adjust filters or trigger an important audit event.
        </p>
      </div>
    </div>
  );
}
