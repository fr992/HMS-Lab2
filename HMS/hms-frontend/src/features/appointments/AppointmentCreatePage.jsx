import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X } from "lucide-react";
import AppointmentForm from "@/features/appointments/components/AppointmentForm";
import AppointmentsListPage from "@/features/appointments/AppointmentsListPage";
import {
  createAppointment,
  getApiErrorMessage,
} from "@/features/appointments/api/appointmentsApi";

function friendlyAppointmentError(error) {
  const raw = getApiErrorMessage(error);
  const message = raw.toLowerCase();

  if (message.includes("overlap") || message.includes("conflict")) {
    return "That time conflicts with another appointment. Choose a different slot.";
  }
  if (message.includes("doctor")) {
    return "The selected doctor could not be used for this appointment. Refresh and try again.";
  }
  if (message.includes("patient")) {
    return "The selected patient could not be used for this appointment. Refresh and try again.";
  }
  if (message.includes("date") || message.includes("start") || message.includes("end")) {
    return "The selected appointment time is invalid. Check the date, start time, and duration.";
  }
  if (
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    error.response?.status === 401 ||
    error.response?.status === 403
  ) {
    return "You do not have permission to create appointments.";
  }
  return raw && raw.length < 180 ? raw : "Appointment could not be created. Try again.";
}

export default function AppointmentCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const initialSlot = location.state?.initialSlot;

  const closeTarget =
    typeof location.state?.returnTo === "string" &&
    location.state.returnTo.startsWith("/appointments") &&
    location.state.returnTo !== "/appointments/new"
      ? location.state.returnTo
      : "/appointments";

  const close = useCallback(() => {
    navigate(closeTarget, { replace: true });
  }, [closeTarget, navigate]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !submitting) close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, submitting]);

  return (
    <div className="relative min-h-full">
      <AppointmentsListPage />
      <div
        className="hms-modal-overlay"
        role="presentation"
      >
        <section
          className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-appointment-title"
          aria-describedby="new-appointment-subtitle"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
            <div>
              <h1
                id="new-appointment-title"
                className="text-xl font-semibold tracking-tight text-slate-950"
              >
                New appointment
              </h1>
              <p
                id="new-appointment-subtitle"
                className="mt-1 text-sm text-slate-500"
              >
                Book a visit for an existing patient
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              aria-label="Close new appointment modal"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <AppointmentForm
            submitting={submitting}
            serverError={error}
            initialSlot={initialSlot}
            onCancel={close}
            onSubmit={async (body) => {
              setError(null);
              setSubmitting(true);
              try {
                await createAppointment(body);
                toast.success("Appointment created");
                navigate(closeTarget, {
                  replace: true,
                  state: { appointmentCreated: true },
                });
              } catch (e) {
                setError(friendlyAppointmentError(e));
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </section>
      </div>
    </div>
  );
}
