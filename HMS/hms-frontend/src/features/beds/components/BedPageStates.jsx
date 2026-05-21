import { BedDouble, X } from "lucide-react";

export function Notice({ message, type = "success" }) {
  if (!message) return null;

  const classes =
    type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div role={type === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${classes}`}>
      {message}
    </div>
  );
}

export function ToastNotice({ notice, onClose }) {
  if (!notice?.message) return null;

  const classes =
    notice.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex max-w-sm justify-end">
      <div
        role={notice.type === "error" ? "alert" : "status"}
        className={`pointer-events-auto flex w-full min-w-72 translate-x-0 items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg transition ${classes}`}
      >
        <p className="min-w-0 flex-1 font-medium">{notice.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-md opacity-70 transition hover:bg-white/60 hover:opacity-100"
          aria-label="Dismiss message"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading beds..." }) {
  return (
    <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
      {label}
    </div>
  );
}

export function EmptyState({ label, detail }) {
  return (
    <div className="flex min-h-[16rem] items-center justify-center p-8 text-center">
      <div>
        <BedDouble className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">{label}</p>
        {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
      </div>
    </div>
  );
}
