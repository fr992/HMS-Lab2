import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  fetchInvoiceById,
  fetchInvoices,
  getApiErrorMessage,
  INVOICE_STATUS,
} from "@/features/invoices/api/invoicesApi";
import InvoiceStatusBadge from "@/features/invoices/components/InvoiceStatusBadge";
import InvoiceFormDialog from "@/features/invoices/components/InvoiceFormDialog";
import { formatDate, formatMoney, keyOf } from "@/features/invoices/invoiceFormat";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";
import {
  openPdfWindow,
  printInvoicePdf,
  printInvoiceSummaryPdf,
  showPdfError,
} from "@/lib/pdfPrint";
import DataTransferMenu from "@/features/dataTransfer/DataTransferMenu";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: INVOICE_STATUS.DRAFT, label: "Draft" },
  { value: INVOICE_STATUS.ISSUED, label: "Issued" },
  { value: INVOICE_STATUS.PARTIALLY_PAID, label: "Partially paid" },
  { value: INVOICE_STATUS.PAID, label: "Paid" },
  { value: INVOICE_STATUS.CANCELLED, label: "Cancelled" },
];

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

export default function InvoicesListPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [printingId, setPrintingId] = useState(null);
  const canCreateInvoice = auth.hasPermission("Invoices.Create");

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

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => items.some((item) => String(item.id) === String(id)))
    );
  }, [items]);

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
  const selectedInvoices = useMemo(
    () => items.filter((item) => selectedIds.includes(String(item.id))),
    [items, selectedIds]
  );
  const allVisibleSelected = items.length > 0 && selectedIds.length === items.length;

  function toggleInvoice(id) {
    const key = String(id);
    setSelectedIds((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  function toggleVisible() {
    setSelectedIds(allVisibleSelected ? [] : items.map((item) => String(item.id)));
  }

  async function handlePrintInvoice(invoice) {
    if (printingId != null) return;
    const pdfWindow = openPdfWindow(`Invoice ${invoice.invoiceNumber || invoice.id}`);
    if (!pdfWindow) {
      setError("Your browser blocked the PDF window. Please allow pop-ups for this app and try again.");
      return;
    }

    setPrintingId(invoice.id);
    try {
      const fullInvoice = await fetchInvoiceById(invoice.id);
      printInvoicePdf(fullInvoice, pdfWindow);
    } catch (err) {
      const message = getApiErrorMessage(err);
      showPdfError(pdfWindow, message);
      setError(message);
    } finally {
      setPrintingId(null);
    }
  }

  function handlePrintSelectedInvoices() {
    const ok = printInvoiceSummaryPdf(selectedInvoices);
    if (!ok) {
      setError("Your browser blocked the PDF window. Please allow pop-ups for this app and try again.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Billing
          </p>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            View all invoices, patient billing details, due dates, and invoice totals.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DataTransferMenu
            endpoint="/data-transfer/invoices"
            exportParams={{
              status: statusFilter === "all" ? undefined : statusFilter,
              search: search.trim() || undefined,
            }}
            canImport={false}
          />
          {canCreateInvoice && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New Invoice
            </button>
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
          label="On this page"
          value={counts.total}
          loading={loading}
          icon={<ReceiptText className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Open"
          value={counts.open}
          loading={loading}
          icon={<Clock3 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Paid"
          value={counts.paid}
          loading={loading}
          icon={<CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />}
        />
        <SummaryTile
          label="Page total"
          value={formatMoney(pageTotal, items[0]?.currency)}
          loading={loading}
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
        {selectedIds.length > 0 && !loading && (
          <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-slate-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">
              {selectedIds.length} invoice{selectedIds.length === 1 ? "" : "s"} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrintSelectedInvoices}
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
              <div key={index} className="grid animate-pulse gap-3 rounded-lg border border-slate-100 p-3 md:grid-cols-[2rem_1fr_1fr_8rem_8rem_6rem]">
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-200" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center p-8 text-center">
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
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisible}
                    aria-label="Select all visible invoices"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </th>
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
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(String(invoice.id))}
                      onChange={() => toggleInvoice(invoice.id)}
                      aria-label={`Select invoice ${invoice.invoiceNumber || invoice.id}`}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                  </td>
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
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(invoice)}
                        disabled={printingId != null}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Printer className="h-4 w-4" aria-hidden />
                        PDF
                      </button>
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

      <InvoiceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(invoice) => {
          setItems((current) => [invoice, ...current]);
          void load();
        }}
      />
    </div>
  );
}
