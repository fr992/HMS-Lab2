import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  Stethoscope,
  UserRound,
  WalletCards,
} from "lucide-react";
import { fetchInvoiceById, getApiErrorMessage } from "@/features/invoices/api/invoicesApi";
import InvoiceStatusBadge from "@/features/invoices/components/InvoiceStatusBadge";
import { formatDate, formatMoney, titleCase } from "@/features/invoices/invoiceFormat";
import { printInvoicePdf } from "@/lib/pdfPrint";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function InfoCard({ icon, label, value, subValue }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">
            {value || "-"}
          </p>
          {subValue && <p className="mt-1 text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function AmountRow({ label, value, currency, emphasis = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={emphasis ? "text-sm font-semibold text-slate-950" : "text-sm text-slate-600"}>
        {label}
      </span>
      <span className={emphasis ? "text-lg font-semibold text-slate-950" : "text-sm font-medium text-slate-900"}>
        {formatMoney(value, currency)}
      </span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const initialInvoice = location.state?.invoice ?? null;

  const [invoice, setInvoice] = useState(initialInvoice);
  const [loading, setLoading] = useState(!initialInvoice);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInvoiceById(id);
      setInvoice(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemCount = invoice?.items?.length ?? 0;
  const statusLabel = useMemo(() => titleCase(invoice?.status), [invoice?.status]);

  if (loading && !invoice) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        Loading invoice...
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            to="/invoices"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to invoices
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {invoice?.invoiceNumber || `Invoice #${id}`}
            </h1>
            {invoice?.status && <InvoiceStatusBadge status={invoice.status} />}
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Invoice details, billing items, and patient context.
          </p>
        </div>

        {invoice && (
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => {
                const ok = printInvoicePdf(invoice);
                if (!ok) {
                  setError("Your browser blocked the PDF window. Please allow pop-ups for this app and try again.");
                }
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <Printer className="h-4 w-4" aria-hidden />
              View PDF
            </button>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total amount
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {formatMoney(invoice.totalAmount, invoice.currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}

      {invoice && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              icon={<UserRound className="h-4 w-4" aria-hidden />}
              label="Patient"
              value={invoice.patientName}
              subValue={invoice.patientNumber || `Profile #${invoice.patientProfileId}`}
            />
            <InfoCard
              icon={<Stethoscope className="h-4 w-4" aria-hidden />}
              label="Encounter"
              value={invoice.encounterNumber || "No encounter linked"}
              subValue={invoice.encounterId ? `Encounter #${invoice.encounterId}` : undefined}
            />
            <InfoCard
              icon={<CalendarClock className="h-4 w-4" aria-hidden />}
              label="Issued"
              value={formatDate(invoice.issuedAt)}
              subValue={invoice.dueAt ? `Due ${formatDate(invoice.dueAt)}` : "No due date"}
            />
            <InfoCard
              icon={<WalletCards className="h-4 w-4" aria-hidden />}
              label="Status"
              value={statusLabel}
              subValue={`Updated ${formatDateTime(invoice.updatedAt)}`}
            />
          </div>

          <section className="grid gap-5 xl:grid-cols-[1fr_22rem]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Invoice items</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {itemCount} item{itemCount === 1 ? "" : "s"} billed.
                  </p>
                </div>
              </div>

              {itemCount === 0 ? (
                <div className="flex min-h-32 items-center justify-center p-6 text-center">
                  <div>
                    <ReceiptText className="mx-auto h-7 w-7 text-slate-300" aria-hidden />
                    <p className="mt-2 text-sm font-medium text-slate-900">No invoice items</p>
                    <p className="mt-1 text-sm text-slate-500">
                      This invoice does not contain billable lines.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{item.description}</p>
                            <p className="mt-1 text-xs text-slate-500">Item #{item.id}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.sourceType
                              ? `${titleCase(item.sourceType)}${item.sourceId ? ` #${item.sourceId}` : ""}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {Number(item.quantity).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatMoney(item.unitPrice, invoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatMoney(item.totalPrice, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="space-y-3">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" aria-hidden />
                  <h2 className="text-base font-semibold text-slate-950">Totals</h2>
                </div>
                <div className="mt-4 space-y-3">
                  <AmountRow
                    label="Subtotal"
                    value={invoice.subtotalAmount}
                    currency={invoice.currency}
                  />
                  <AmountRow
                    label="Discount"
                    value={invoice.discountAmount}
                    currency={invoice.currency}
                  />
                  <AmountRow
                    label="Tax"
                    value={invoice.taxAmount}
                    currency={invoice.currency}
                  />
                  <div className="border-t border-slate-200 pt-3">
                    <AmountRow
                      label="Total"
                      value={invoice.totalAmount}
                      currency={invoice.currency}
                      emphasis
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">Audit</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Created</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {formatDateTime(invoice.createdAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Updated</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {formatDateTime(invoice.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </section>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
