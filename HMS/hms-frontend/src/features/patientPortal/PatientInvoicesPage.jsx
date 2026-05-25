import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, FileText, Loader2, ReceiptText } from "lucide-react";
import { payInvoiceOnline, rememberPaymentReturnPath } from "@/api/paymentService";
import InvoiceStatusBadge from "@/features/invoices/components/InvoiceStatusBadge";
import { fetchMyInvoices } from "@/features/patientPortal/patientPortalApi";
import {
  formatDateTime,
  formatMoney,
  getApiErrorMessage,
  getPagedItems,
  keyOf,
} from "@/features/dashboard/dashboardUtils";
import { EmptyBox, ErrorBox, LoadingBox, PageHeader } from "@/features/patientPortal/PatientAppointmentsPage";

export default function PatientInvoicesPage() {
  const [state, setState] = useState({ status: "loading", items: [], error: "" });
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const data = await fetchMyInvoices({ page: 1, pageSize: 50 });
      setState({ status: "ready", items: getPagedItems(data), error: "" });
    } catch (error) {
      setState({ status: "error", items: [], error: getApiErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const payable = state.items.filter(canPayInvoice);
    return {
      dueCount: payable.length,
      dueAmount: payable.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0),
      currency: state.items[0]?.currency || "EUR",
    };
  }, [state.items]);

  async function handlePay(invoice) {
    if (payingInvoiceId) return;

    setPayingInvoiceId(invoice.id);
    setState((current) => ({ ...current, error: "" }));
    try {
      const data = await payInvoiceOnline(invoice.id);
      if (!data?.url) throw new Error("Stripe did not return a checkout URL.");
      rememberPaymentReturnPath();
      window.location.assign(data.url);
    } catch (error) {
      setPayingInvoiceId(null);
      setState((current) => ({ ...current, status: "ready", error: getApiErrorMessage(error) }));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        title="My invoices"
        subtitle="Review invoice totals and pay outstanding balances online."
        onRefresh={load}
        refreshing={state.status === "loading"}
      />
      {state.status === "ready" && (
        <section className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Invoices due" value={totals.dueCount} icon={<ReceiptText className="size-5" />} />
          <SummaryCard
            label="Amount due"
            value={formatMoney(totals.dueAmount, totals.currency)}
            icon={<CreditCard className="size-5" />}
          />
        </section>
      )}
      {state.error && <ErrorBox message={state.error} />}
      {state.status === "loading" && <LoadingBox label="Loading invoices..." />}
      {state.status === "ready" && (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {state.items.length === 0 ? (
            <EmptyBox>No invoices available.</EmptyBox>
          ) : (
            <div className="divide-y divide-slate-100">
              {state.items.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  paying={payingInvoiceId === invoice.id}
                  onPay={() => handlePay(invoice)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function InvoiceRow({ invoice, paying, onPay }) {
  const payable = canPayInvoice(invoice);

  return (
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="size-4 text-slate-400" aria-hidden />
          <h2 className="font-semibold text-slate-950">{invoice.invoiceNumber || `Invoice #${invoice.id}`}</h2>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {[invoice.encounterNumber, invoice.dueAt ? `Due ${formatDateTime(invoice.dueAt)}` : null]
            .filter(Boolean)
            .join(" - ") || "No due date"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <p className="text-base font-semibold text-slate-950">
          {formatMoney(invoice.totalAmount, invoice.currency)}
        </p>
        {payable && (
          <button
            type="button"
            onClick={onPay}
            disabled={paying}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paying ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            {paying ? "Opening..." : "Pay online"}
          </button>
        )}
      </div>
    </article>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="text-sky-600">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function canPayInvoice(invoice) {
  return ["draft", "issued", "partially_paid"].includes(keyOf(invoice.status));
}
