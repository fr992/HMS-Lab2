import { useEffect, useState } from "react";

const MIN = 3;

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(reason: string) => Promise<void>} props.onSubmit
 * @param {boolean} props.submitting
 * @param {string} [props.error]
 */
export default function AppointmentCancelModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setLocalError("");
    }
  }, [open]);

  if (!open) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= MIN;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setLocalError(`Please enter at least ${MIN} characters.`);
      return;
    }
    setLocalError("");
    await onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-appt-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={submitting ? undefined : onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2
          id="cancel-appt-title"
          className="text-lg font-semibold text-slate-900"
        >
          Cancel appointment
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          A cancellation reason is required for the record.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Cancellation reason
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50"
              placeholder="Explain why this appointment is cancelled"
              required
              minLength={MIN}
            />
          </label>
          {(error || localError) && (
            <p className="text-sm text-rose-700" role="alert">
              {error || localError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Cancelling…" : "Confirm cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
