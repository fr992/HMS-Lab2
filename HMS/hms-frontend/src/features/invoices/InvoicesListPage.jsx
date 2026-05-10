import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  FileText,
  ReceiptText,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  fetchInvoices,
  getApiErrorMessage,
  INVOICE_STATUS,
} from "@/features/invoices/api/invoicesApi";
import InvoiceStatusBadge from "@/features/invoices/components/InvoiceStatusBadge";
import { formatDate, formatMoney, keyOf } from "@/features/invoices/invoiceFormat";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: INVOICE_STATUS.DRAFT, label: "Draft" },
  { value: INVOICE_STATUS.ISSUED, label: "Issued" },
  { value: INVOICE_STATUS.PARTIALLY_PAID, label: "Partially paid" },
  { value: INVOICE_STATUS.PAID, label: "Paid" },
  { value: INVOICE_STATUS.CANCELLED, label: "Cancelled" },
];

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

export default function InvoicesListPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInvoices({
        status: statusFilter,
        search: search.trim() || undefined,
        page,
        pageSize: 25,
      });
      setItems(getPagedItems(data));
      setPagination(getPagination(data));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const next = {
      total: items.length,
      open: 0,
      paid: 0,
      cancelled: 0,
    };

    for (const item of items) {
      const status = keyOf(item.status);
      if (status === INVOICE_STATUS.PAID) next.paid += 1;
      else if (status === INVOICE_STATUS.CANCELLED) next.cancelled += 1;
      else next.open += 1;
    }

    return next;
  }, [items]);

  const pageTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0),
    [items]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Billing
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Invoices
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            View all invoices, patient billing details, due dates, and invoice totals.
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
          label="On this page"
          value={counts.total}
          icon={<ReceiptText className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Open"
          value={counts.open}
          icon={<Clock3 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Paid"
          value={counts.paid}
          icon={<CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Page total"
          value={formatMoney(pageTotal, items[0]?.currency)}
          icon={<Banknote className="h-4 w-4 text-slate-400" aria-hidden />}
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
                placeholder="Invoice number, patient number, or patient name"
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
        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
            Loading invoices...
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center p-8 text-center">
            <div>
              <ReceiptText className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-900">
                No invoices found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjust filters or refresh after new invoices are issued.
              </p>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Encounter</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((invoice) => (
                <tr key={invoice.id} className="align-top transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">Invoice #{invoice.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p className="font-medium text-slate-800">{invoice.patientName || "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">{invoice.patientNumber || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {invoice.encounterNumber || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(invoice.issuedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(invoice.dueAt)}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(invoice.totalAmount, invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/invoices/${invoice.id}`, {
                            state: { invoice },
                          })
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                        View
                      </button>
                    </div>
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
