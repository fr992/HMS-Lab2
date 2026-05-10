import { CheckCircle2, Clock3, FileText, WalletCards, XCircle } from "lucide-react";
import { keyOf, titleCase } from "@/features/invoices/invoiceFormat";

const STATUS_META = {
  draft: {
    label: "Draft",
    icon: FileText,
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  issued: {
    label: "Issued",
    icon: Clock3,
    badge: "bg-sky-50 text-sky-900 ring-sky-200",
  },
  partially_paid: {
    label: "Partially paid",
    icon: WalletCards,
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    badge: "bg-rose-50 text-rose-900 ring-rose-200",
  },
};

export default function InvoiceStatusBadge({ status }) {
  const key = keyOf(status);
  const meta = STATUS_META[key] ?? {
    label: titleCase(status) || "Unknown",
    icon: FileText,
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
