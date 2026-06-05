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
      className="hms-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={loading ? undefined : onClose}
      />
      <div className="hms-modal-panel relative max-w-md">
        <div className="hms-modal-header">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-slate-950">
              {title}
            </h2>
            {message && (
              <p className="mt-1 text-sm text-slate-600" role="note">
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="hms-modal-body">
        <div className="hms-modal-footer">
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
    </div>
  );
}
