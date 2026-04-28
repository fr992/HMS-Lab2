import { APPOINTMENT_STATUS } from "@/appointments/appointmentConstants";

const STYLES = {
  [APPOINTMENT_STATUS.SCHEDULED]:
    "bg-slate-100 text-slate-800 ring-slate-200/80",
  [APPOINTMENT_STATUS.CONFIRMED]: "bg-sky-100 text-sky-900 ring-sky-200/80",
  [APPOINTMENT_STATUS.COMPLETED]:
    "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  [APPOINTMENT_STATUS.CANCELLED]: "bg-rose-100 text-rose-900 ring-rose-200/80",
  [APPOINTMENT_STATUS.NO_SHOW]: "bg-amber-100 text-amber-950 ring-amber-200/80",
};

const LABELS = {
  [APPOINTMENT_STATUS.SCHEDULED]: "Scheduled",
  [APPOINTMENT_STATUS.CONFIRMED]: "Confirmed",
  [APPOINTMENT_STATUS.COMPLETED]: "Completed",
  [APPOINTMENT_STATUS.CANCELLED]: "Cancelled",
  [APPOINTMENT_STATUS.NO_SHOW]: "No show",
};

/**
 * @param {object} props
 * @param {string} props.status
 */
export default function AppointmentStatusBadge({ status }) {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  const className = STYLES[key] ?? "bg-slate-100 text-slate-700 ring-slate-200/80";
  const label = LABELS[key] ?? status ?? "Unknown";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}
