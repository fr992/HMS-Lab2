import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import {
  confirmCashPayment,
  createStripeCheckout,
  createPayment,
  getApiErrorMessage,
  getPayment,
  listPayments,
  PAYMENT_METHOD,
  rememberPaymentReturnPath,
  PAYMENT_STATUS,
  updatePaymentStatus,
} from "@/api/paymentService";
import { fetchInvoices } from "@/features/invoices/api/invoicesApi";
import { formatMoney, keyOf, titleCase } from "@/features/invoices/invoiceFormat";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";
import DataTransferMenu from "@/features/dataTransfer/DataTransferMenu";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: PAYMENT_STATUS.PENDING, label: "Pending" },
  { value: PAYMENT_STATUS.PAID, label: "Paid" },
  { value: PAYMENT_STATUS.FAILED, label: "Failed" },
  { value: PAYMENT_STATUS.CANCELLED, label: "Cancelled" },
  { value: PAYMENT_STATUS.REFUNDED, label: "Refunded" },
];

const METHOD_OPTIONS = [
  { value: "all", label: "All methods" },
  { value: PAYMENT_METHOD.CASH, label: "Cash" },
  { value: PAYMENT_METHOD.CARD, label: "Card" },
  { value: PAYMENT_METHOD.BANK_TRANSFER, label: "Bank transfer" },
  { value: PAYMENT_METHOD.INSURANCE, label: "Insurance" },
  { value: PAYMENT_METHOD.ONLINE, label: "Online" },
];

const CREATE_METHOD_OPTIONS = METHOD_OPTIONS.filter((option) => option.value !== "all");
const ACTION_MENU_WIDTH = 192;
const ACTION_MENU_ROW_HEIGHT = 40;
const ACTION_MENU_PADDING = 8;
const EMPTY_PAYMENT_FORM = {
  invoiceId: "",
  amount: "",
  paymentMethod: PAYMENT_METHOD.CASH,
  transactionReference: "",
};

function formatDateTime(value, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function methodLabel(value) {
  return titleCase(value || "").replace("Bank Transfer", "Bank transfer") || "-";
}

function invoiceLabel(invoice) {
  return invoice?.invoiceNumber || `#${invoice?.id || ""}`;
}

function StatusBadge({ status }) {
  const key = keyOf(status);
  const classes = {
    [PAYMENT_STATUS.PENDING]: "bg-amber-50 text-amber-800 ring-amber-200",
    [PAYMENT_STATUS.PAID]: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    [PAYMENT_STATUS.FAILED]: "bg-rose-50 text-rose-800 ring-rose-200",
    [PAYMENT_STATUS.CANCELLED]: "bg-slate-100 text-slate-700 ring-slate-200",
    [PAYMENT_STATUS.REFUNDED]: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        classes[key] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {titleCase(status) || "Unknown"}
    </span>
  );
}

function MethodBadge({ method }) {
  return (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
      {methodLabel(method)}
    </span>
  );
}

function canConfirmCash(payment, hasPermission) {
  const status = keyOf(payment.status);
  return (
    hasPermission &&
    normalize(payment.paymentMethod) === PAYMENT_METHOD.CASH &&
    ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.REFUNDED].includes(status)
  );
}

function canStartStripeCheckout(payment, hasPermission) {
  const status = keyOf(payment.status);
  const method = normalize(payment.paymentMethod);
  return (
    hasPermission &&
    status === PAYMENT_STATUS.PENDING &&
    [PAYMENT_METHOD.ONLINE, PAYMENT_METHOD.CARD].includes(method)
  );
}

function statusChoicesFor(currentStatus) {
  const current = keyOf(currentStatus);
  if (current === PAYMENT_STATUS.PAID) {
    return [{ value: PAYMENT_STATUS.REFUNDED, label: "Refunded" }];
  }
  if ([PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.REFUNDED].includes(current)) {
    return [];
  }
  return STATUS_OPTIONS.filter((option) => option.value !== "all");
}

export default function PaymentsPage() {
  const auth = useAuth();
  const canCreate = auth.hasPermission("Payments.Create");
  const canUpdateStatus = auth.hasPermission("Payments.UpdateStatus");
  const canConfirmCashPayment = auth.hasPermission("Payments.ConfirmCash");

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkoutPaymentId, setCheckoutPaymentId] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ type: null, payment: null });
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [formError, setFormError] = useState("");
  const [nextStatus, setNextStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listPayments({
        search: search.trim() || undefined,
        status: statusFilter,
        paymentMethod: methodFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
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
  }, [fromDate, methodFilter, page, search, statusFilter, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const next = { total: items.length, paid: 0, pending: 0, failedCancelled: 0 };
    for (const payment of items) {
      const status = keyOf(payment.status);
      if (status === PAYMENT_STATUS.PAID) next.paid += 1;
      if (status === PAYMENT_STATUS.PENDING) next.pending += 1;
      if ([PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED].includes(status)) {
        next.failedCancelled += 1;
      }
    }
    return next;
  }, [items]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  function openCreate() {
    setPaymentForm(EMPTY_PAYMENT_FORM);
    setFormError("");
    setDialog({ type: "create", payment: null });
  }

  async function openDetails(payment) {
    setDialog({ type: "view", payment });
    try {
      const details = await getPayment(payment.id);
      setDialog({ type: "view", payment: details });
    } catch {
      setDialog({ type: "view", payment });
    }
  }

  function openStatus(payment) {
    const choices = statusChoicesFor(payment.status);
    setFormError("");
    setNextStatus(choices[0]?.value || "");
    setDialog({ type: "status", payment });
  }

  function openConfirm(payment) {
    setFormError("");
    setDialog({ type: "confirmCash", payment });
  }

  function closeDialog() {
    setDialog({ type: null, payment: null });
    setFormError("");
    setSaving(false);
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (saving) return;

    const invoiceId = Number.parseInt(paymentForm.invoiceId, 10);
    const amount = Number(paymentForm.amount);
    if (!invoiceId || invoiceId < 1) {
      setFormError("Select an invoice or enter a valid invoice ID.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await createPayment({
        invoiceId,
        amount,
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference.trim() || null,
      });
      toast.success("Payment created.");
      closeDialog();
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(event) {
    event.preventDefault();
    if (saving || !dialog.payment || !nextStatus) return;

    setSaving(true);
    setFormError("");
    try {
      await updatePaymentStatus(dialog.payment.id, { status: nextStatus });
      toast.success("Payment status updated.");
      closeDialog();
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmCash() {
    if (saving || !dialog.payment) return;

    setSaving(true);
    setFormError("");
    try {
      await confirmCashPayment(dialog.payment.id);
      toast.success("Cash payment confirmed.");
      closeDialog();
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStripeCheckout(payment) {
    if (checkoutPaymentId) return;

    setCheckoutPaymentId(payment.id);
    setError("");
    try {
      const data = await createStripeCheckout(payment.id);
      if (!data?.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }
      rememberPaymentReturnPath();
      window.location.assign(data.url);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setCheckoutPaymentId(null);
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
            Track invoice payments, confirmations, and payment statuses.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DataTransferMenu
            endpoint="/data-transfer/payments"
            exportParams={{
              search: search.trim() || undefined,
              status: statusFilter === "all" ? undefined : statusFilter,
            }}
            canImport={false}
          />
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New Payment
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
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Total Payments" value={stats.total} helper="Visible records" icon={<Banknote className="h-4 w-4 text-slate-400" aria-hidden />} />
        <SummaryTile label="Paid" value={stats.paid} helper="Confirmed payments" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />} />
        <SummaryTile label="Pending" value={stats.pending} helper="Awaiting confirmation" icon={<Clock3 className="h-4 w-4 text-amber-500" aria-hidden />} />
        <SummaryTile label="Failed / Cancelled" value={stats.failedCancelled} helper="Needs review" icon={<XCircle className="h-4 w-4 text-rose-500" aria-hidden />} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end lg:flex-nowrap">
          <FilterField label="Search" className="md:min-w-[18rem] md:flex-[2_1_20rem] lg:min-w-0">
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Invoice number or transaction reference"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </span>
          </FilterField>
          <SelectFilter className="md:min-w-40 md:flex-[1_1_10rem] lg:min-w-0" label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} onBeforeChange={() => setPage(1)} />
          <SelectFilter className="md:min-w-44 md:flex-[1_1_11rem] lg:min-w-0" label="Method" value={methodFilter} onChange={setMethodFilter} options={METHOD_OPTIONS} onBeforeChange={() => setPage(1)} />
          <DateFilter className="md:min-w-36 md:flex-[0_1_9.5rem] lg:min-w-0" label="From" value={fromDate} onChange={setFromDate} />
          <DateFilter className="md:min-w-36 md:flex-[0_1_9.5rem] lg:min-w-0" label="To" value={toDate} onChange={setToDate} />
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 w-full shrink-0 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 md:w-auto"
          >
            Clear
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          {error}
        </div>
      )}

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <PaymentsTable
            items={items}
            canUpdateStatus={canUpdateStatus}
            canConfirmCashPayment={canConfirmCashPayment}
            canCreate={canCreate}
            onView={openDetails}
            onStatus={openStatus}
            onConfirmCash={openConfirm}
            onStripeCheckout={handleStripeCheckout}
            checkoutPaymentId={checkoutPaymentId}
          />
        )}
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>

      {dialog.type === "view" && (
        <PaymentDetailsModal payment={dialog.payment} onClose={closeDialog} />
      )}
      {dialog.type === "create" && (
        <NewPaymentModal
          form={paymentForm}
          error={formError}
          saving={saving}
          onChange={(patch) => setPaymentForm((current) => ({ ...current, ...patch }))}
          onClose={closeDialog}
          onSubmit={handleCreate}
        />
      )}
      {dialog.type === "status" && (
        <UpdateStatusModal
          payment={dialog.payment}
          nextStatus={nextStatus}
          choices={statusChoicesFor(dialog.payment?.status)}
          error={formError}
          saving={saving}
          onNextStatus={setNextStatus}
          onClose={closeDialog}
          onSubmit={handleStatusUpdate}
        />
      )}
      {dialog.type === "confirmCash" && (
        <ConfirmCashModal
          payment={dialog.payment}
          error={formError}
          saving={saving}
          onClose={closeDialog}
          onConfirm={handleConfirmCash}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, helper, icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        <CountUpValue value={value} />
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function FilterField({ label, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectFilter({ label, className, value, onChange, options, onBeforeChange }) {
  return (
    <FilterField label={label} className={className}>
      <select
        value={value}
        onChange={(event) => {
          onBeforeChange?.();
          onChange(event.target.value);
        }}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

function DateFilter({ label, className, value, onChange }) {
  return (
    <FilterField label={label} className={className}>
      <span className="relative block">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      </span>
    </FilterField>
  );
}

function PaymentsTable({
  items,
  canUpdateStatus,
  canConfirmCashPayment,
  canCreate,
  checkoutPaymentId,
  onView,
  onStatus,
  onConfirmCash,
  onStripeCheckout,
}) {
  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3">Invoice</th>
          <th className="px-4 py-3 text-right">Amount</th>
          <th className="px-4 py-3">Method</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Paid At</th>
          <th className="px-4 py-3">Received By</th>
          <th className="px-4 py-3">Transaction Reference</th>
          <th className="w-16 px-4 py-3 text-center">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {items.map((payment) => (
          <tr key={payment.id} className="align-middle transition hover:bg-slate-50/70">
            <td className="px-4 py-3">
              <p className="font-medium text-slate-900">
                {payment.invoiceNumber || `#${payment.invoiceId}`}
              </p>
              <p className="mt-1 text-xs text-slate-500">Payment #{payment.id}</p>
            </td>
            <td className="px-4 py-3 text-right font-semibold text-slate-900">
              {formatMoney(payment.amount)}
            </td>
            <td className="px-4 py-3"><MethodBadge method={payment.paymentMethod} /></td>
            <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
            <td className="px-4 py-3 text-slate-600">{formatDateTime(payment.paidAt, "Not paid")}</td>
            <td className="px-4 py-3 text-slate-600">{payment.receivedByUserName || "—"}</td>
            <td className="px-4 py-3 text-slate-600">{payment.transactionReference || "—"}</td>
            <td className="px-4 py-3 text-center">
              <PaymentActionsMenu
                payment={payment}
                canUpdateStatus={canUpdateStatus}
                canConfirmCashPayment={canConfirmCashPayment}
                canCreate={canCreate}
                onView={onView}
                onStatus={onStatus}
                onConfirmCash={onConfirmCash}
                onStripeCheckout={onStripeCheckout}
                checkoutPaymentId={checkoutPaymentId}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentActionsMenu({
  payment,
  canUpdateStatus,
  canConfirmCashPayment,
  canCreate,
  checkoutPaymentId,
  onView,
  onStatus,
  onConfirmCash,
  onStripeCheckout,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const nudgedForOpenRef = useRef(false);

  const actions = useMemo(() => {
    const next = [
      {
        key: "view",
        label: "View details",
        icon: Eye,
        onClick: () => onView(payment),
      },
    ];

    if (canUpdateStatus && statusChoicesFor(payment.status).length > 0) {
      next.push({
        key: "status",
        label: "Update status",
        icon: RefreshCw,
        onClick: () => onStatus(payment),
      });
    }

    if (canConfirmCash(payment, canConfirmCashPayment)) {
      next.push({
        key: "confirmCash",
        label: "Confirm cash",
        icon: CheckCircle2,
        onClick: () => onConfirmCash(payment),
      });
    }

    if (canStartStripeCheckout(payment, canCreate)) {
      next.push({
        key: "checkout",
        label: checkoutPaymentId === payment.id ? "Opening Stripe..." : "Pay with Stripe",
        icon: ExternalLink,
        onClick: () => onStripeCheckout(payment),
      });
    }

    return next;
  }, [
    canConfirmCashPayment,
    canCreate,
    canUpdateStatus,
    checkoutPaymentId,
    onConfirmCash,
    onStatus,
    onStripeCheckout,
    onView,
    payment,
  ]);

  useLayoutEffect(() => {
    if (!open) {
      nudgedForOpenRef.current = false;
      setPosition(null);
      return;
    }

    const trigger = buttonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = ACTION_MENU_PADDING * 2 + actions.length * ACTION_MENU_ROW_HEIGHT;
    const gap = 4;
    const margin = 8;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = rect.bottom + gap;
    if (
      rect.bottom + gap + menuHeight > viewportHeight - margin &&
      rect.top - gap - menuHeight > margin
    ) {
      top = rect.top - gap - menuHeight;
    }
    if (top + menuHeight > viewportHeight - margin) {
      top = Math.max(margin, viewportHeight - margin - menuHeight);
    }
    if (top < margin) top = margin;

    let left = rect.right - ACTION_MENU_WIDTH;
    if (left < margin) left = margin;
    if (left + ACTION_MENU_WIDTH > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - ACTION_MENU_WIDTH - margin);
    }

    setPosition({ top, left });
  }, [actions.length, open]);

  useLayoutEffect(() => {
    if (!open || !position || nudgedForOpenRef.current) return;
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    if (rect.bottom <= viewportHeight - 4) return;

    nudgedForOpenRef.current = true;
    const nudge = rect.bottom - (viewportHeight - 4);
    setPosition((current) =>
      current ? { left: current.left, top: Math.max(4, current.top - nudge) } : current
    );
  }, [open, position]);

  useEffect(() => {
    if (!open) return;

    const close = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", close, true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", close, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnResize = () => setOpen(false);

    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", closeOnResize);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [open]);

  const menu =
    open && position
      ? createPortal(
          <ul
            ref={menuRef}
            className="pointer-events-auto fixed m-0 w-48 min-w-48 max-w-48 list-none rounded-lg border border-slate-200/90 bg-white p-0 py-1.5 text-slate-900 shadow-xl z-index:200"
            style={{ top: position.top, left: position.left }}
            role="menu"
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.key}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer select-none items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      action.onClick();
                    }}
                  >
                    <Icon className="size-4 text-slate-500" aria-hidden />
                    <span>{action.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
        aria-label="Payment actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {menu}
    </>
  );
}

function DialogFrame({ title, subtitle, icon, children, onClose, maxWidth = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className={`w-full ${maxWidth} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function PaymentDetailsModal({ payment, onClose }) {
  const invoiceDisplay = payment?.invoiceNumber || `#${payment?.invoiceId || "-"}`;

  return (
    <DialogFrame
      title="Payment details"
      subtitle={invoiceDisplay}
      icon={<FileText className="size-6" aria-hidden />}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 bg-slate-50 px-6 py-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
            <PaymentSummaryItem
              label="Amount"
              value={formatMoney(payment?.amount)}
              valueClassName="text-2xl font-semibold tracking-tight text-slate-950"
            />
            <PaymentSummaryItem label="Status" value={<StatusBadge status={payment?.status} />} />
            <PaymentSummaryItem
              label="Method"
              value={<MethodBadge method={payment?.paymentMethod} />}
            />
            <PaymentSummaryItem
              label="Paid at"
              value={formatDateTime(payment?.paidAt, "Not paid")}
            />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="Invoice information">
            <DetailRow label="Invoice number" value={invoiceDisplay} strong />
            <DetailRow label="Invoice ID" value={`#${payment?.invoiceId || "-"}`} />
            <DetailRow label="Payment ID" value={payment?.id ? `#${payment.id}` : "-"} />
          </DetailSection>

          <DetailSection title="Transaction information">
            <DetailRow label="Transaction reference" value={payment?.transactionReference || "—"} />
            <DetailRow label="Payment method" value={methodLabel(payment?.paymentMethod)} strong />
            <DetailRow label="Received by" value={payment?.receivedByUserName || "—"} />
          </DetailSection>

          <DetailSection title="Audit information" className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Created at" value={formatDateTime(payment?.createdAt)} muted />
              <DetailRow label="Updated at" value={formatDateTime(payment?.updatedAt)} muted />
            </div>
          </DetailSection>
        </div>
      </div>
    </DialogFrame>
  );
}

function PaymentSummaryItem({ label, value, valueClassName = "text-sm font-semibold text-slate-900" }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className={`mt-1.5 min-h-7 ${valueClassName}`}>{value}</div>
    </div>
  );
}

function DetailSection({ title, className = "", children }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, strong = false, muted = false }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr] sm:items-center">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={[
          "text-sm text-slate-900",
          strong ? "font-semibold" : "font-medium",
          muted ? "text-slate-600" : "",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function NewPaymentModal({ form, error, saving, onChange, onClose, onSubmit }) {
  const [invoiceQuery, setInvoiceQuery] = useState(form.invoiceId ? `#${form.invoiceId}` : "");
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInvoices() {
      setInvoiceLoading(true);
      try {
        const data = await fetchInvoices({
          search: invoiceQuery.trim() || undefined,
          page: 1,
          pageSize: 8,
        });
        if (active) setInvoiceOptions(getPagedItems(data));
      } catch {
        if (active) setInvoiceOptions([]);
      } finally {
        if (active) setInvoiceLoading(false);
      }
    }

    void loadInvoices();
    return () => {
      active = false;
    };
  }, [invoiceQuery]);

  function handleInvoiceQuery(value) {
    setInvoiceQuery(value);
    setInvoiceOpen(true);
    const trimmed = value.trim().replace(/^#/, "");
    const numericId = /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : null;
    onChange({
      invoiceId: numericId && numericId > 0 ? String(numericId) : "",
    });
  }

  function chooseInvoice(invoice) {
    onChange({
      invoiceId: String(invoice.id),
      amount: String(Number(invoice.totalAmount) || ""),
    });
    setInvoiceQuery(invoiceLabel(invoice));
    setInvoiceOpen(false);
  }

  return (
    <DialogFrame
      title="New payment"
      subtitle="Create a pending payment for an invoice."
      icon={<CreditCard className="size-6" aria-hidden />}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4 bg-slate-50 px-6 py-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Invoice" required>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={invoiceQuery}
                onChange={(event) => handleInvoiceQuery(event.target.value)}
                onFocus={() => setInvoiceOpen(true)}
                onBlur={() => window.setTimeout(() => setInvoiceOpen(false), 120)}
                disabled={saving}
                placeholder="Search invoice number or enter ID"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              {invoiceOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {invoiceLoading ? (
                    <p className="px-3 py-2 text-sm text-slate-500">Loading invoices...</p>
                  ) : invoiceOptions.length > 0 ? (
                    invoiceOptions.map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseInvoice(invoice)}
                        className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-900">
                            {invoice.invoiceNumber || `#${invoice.id}`}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {[invoice.patientName, invoice.patientNumber].filter(Boolean).join(" - ") || `Invoice #${invoice.id}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-slate-700">
                          {formatMoney(invoice.totalAmount, invoice.currency)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">
                      No invoices found. Enter a numeric invoice ID if needed.
                    </p>
                  )}
                </div>
              )}
            </div>
            {form.invoiceId && (
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                Selected invoice ID: #{form.invoiceId}
              </p>
            )}
          </FormField>
          <FormField label="Amount" required>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => onChange({ amount: event.target.value })}
              disabled={saving}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>
          <FormField label="Payment method" required>
            <select
              value={form.paymentMethod}
              onChange={(event) => onChange({ paymentMethod: event.target.value })}
              disabled={saving}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              {CREATE_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Transaction reference">
            <input
              value={form.transactionReference}
              onChange={(event) => onChange({ transactionReference: event.target.value })}
              disabled={saving}
              placeholder="Optional"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>
        </div>
        <ModalError message={error} />
        <DialogActions saving={saving} submitLabel="Create payment" savingLabel="Creating..." onClose={onClose} />
      </form>
    </DialogFrame>
  );
}

function UpdateStatusModal({ payment, nextStatus, choices, error, saving, onNextStatus, onClose, onSubmit }) {
  return (
    <DialogFrame
      title="Update status"
      subtitle={payment?.invoiceNumber || `Payment #${payment?.id || "-"}`}
      icon={<ShieldCheck className="size-6" aria-hidden />}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <form onSubmit={onSubmit} className="space-y-4 bg-slate-50 px-6 py-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</p>
          <div className="mt-2"><StatusBadge status={payment?.status} /></div>
        </div>
        {choices.length > 0 ? (
          <FormField label="New status" required>
            <select
              value={nextStatus}
              onChange={(event) => onNextStatus(event.target.value)}
              disabled={saving}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              {choices.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            This payment status cannot be changed from the current state.
          </p>
        )}
        <ModalError message={error} />
        <DialogActions saving={saving || choices.length === 0} submitLabel="Update status" savingLabel="Updating..." onClose={onClose} />
      </form>
    </DialogFrame>
  );
}

function ConfirmCashModal({ payment, error, saving, onClose, onConfirm }) {
  return (
    <DialogFrame
      title="Confirm cash"
      subtitle={payment?.invoiceNumber || `Payment #${payment?.id || "-"}`}
      icon={<Banknote className="size-6" aria-hidden />}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 bg-slate-50 px-6 py-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">Confirm this cash payment as paid?</p>
          <p className="mt-1 text-sm text-slate-500">
            {formatMoney(payment?.amount)} for {payment?.invoiceNumber || `invoice #${payment?.invoiceId || "-"}`}
          </p>
        </div>
        <ModalError message={error} />
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
            {saving ? "Confirming..." : "Confirm cash"}
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}

function FormField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function DialogActions({ saving, submitLabel, savingLabel, onClose }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
      <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
        Cancel
      </button>
      <button type="submit" disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  );
}

function ModalError({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
      Loading payments...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-64 items-center justify-center p-8 text-center">
      <div>
        <CreditCard className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">No payments found</p>
        <p className="mt-1 text-sm text-slate-500">
          Adjust filters or create a payment after an invoice is issued.
        </p>
      </div>
    </div>
  );
}
