import { useId } from "react";

export default function ConfirmDeleteModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  loading,
  onClose,
  onConfirm,
}) {
  const id = useId();
  const titleId = `dlg-${id}`;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/40"
        aria-label="Close"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {message && (
          <p className="mt-2 text-sm text-slate-600" role="note">
            {message}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
