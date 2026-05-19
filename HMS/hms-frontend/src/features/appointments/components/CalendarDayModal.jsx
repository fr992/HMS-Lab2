import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import AppointmentCancelModal from "@/features/appointments/components/AppointmentCancelModal";
import AppointmentStatusBadge from "@/features/appointments/components/AppointmentStatusBadge";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";
import {
  getAppointmentRowActions,
  isAppointmentActionVisible,
} from "@/features/appointments/appointmentRowActionModel";
import {
  getApiErrorMessage,
  openOrCreateEncounterFromAppointment,
  patchAppointmentStatus,
} from "@/features/appointments/api/appointmentsApi";

function formatDateHeading(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  const options = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString(undefined, options)} - ${end.toLocaleTimeString(
    undefined,
    options
  )}`;
}

function AppointmentActions({
  appointment,
  canManageStatus,
  canEdit,
  canVisit,
  encounterBasePath,
  onMutated,
  onToast,
  onClose,
}) {
  const navigate = useNavigate();
  const [mutating, setMutating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const actions = getAppointmentRowActions(appointment.status).filter((action) =>
    isAppointmentActionVisible(action, { canManageStatus, canEdit, canVisit })
  );

  const patchStatus = async (target) => {
    if (mutating) return;
    setMutating(true);
    try {
      await patchAppointmentStatus(appointment.id, { status: target });
      onToast("Status updated.", "success");
      await onMutated();
    } catch (error) {
      onToast(getApiErrorMessage(error), "error");
    } finally {
      setMutating(false);
    }
  };

  const submitCancel = async (reason) => {
    if (mutating) return;
    setMutating(true);
    setCancelError("");
    try {
      await patchAppointmentStatus(appointment.id, {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancellationReason: reason,
      });
      setCancelOpen(false);
      onToast("Appointment cancelled.", "success");
      await onMutated();
    } catch (error) {
      setCancelError(getApiErrorMessage(error));
    } finally {
      setMutating(false);
    }
  };

  const runAction = (action) => {
    if (action.kind === "view") {
      onClose();
      navigate(`/appointments/${appointment.id}`);
      return;
    }
    if (action.kind === "edit") {
      onClose();
      navigate(`/appointments/${appointment.id}/edit`);
      return;
    }
    if (action.kind === "visit") {
      void (async () => {
        if (mutating) return;
        setMutating(true);
        try {
          const encounter = await openOrCreateEncounterFromAppointment(appointment);
          onClose();
          navigate(`${encounterBasePath}/${encounter.id}`);
        } catch (error) {
          onToast(getApiErrorMessage(error), "error");
        } finally {
          setMutating(false);
        }
      })();
      return;
    }
    if (action.kind === "cancel") {
      setCancelError("");
      setCancelOpen(true);
      return;
    }
    if (action.kind === "status" && action.target) {
      void patchStatus(action.target);
    }
  };

  if (actions.length === 0) return null;

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={mutating}
            onClick={() => runAction(action)}
            className={
              action.id === "cancel"
                ? "rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            }
          >
            {mutating ? "Saving..." : action.label}
          </button>
        ))}
      </div>

      <AppointmentCancelModal
        open={cancelOpen}
        onClose={() => !mutating && setCancelOpen(false)}
        onSubmit={submitCancel}
        submitting={mutating}
        error={cancelError}
      />
    </>
  );
}

export default function CalendarDayModal({
  date,
  appointments,
  canManageStatus,
  canEdit,
  canVisit,
  encounterBasePath,
  canCreate,
  onMutated,
  onToast,
  onClose,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!date) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [date, onClose]);

  const sorted = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart)
      ),
    [appointments]
  );

  if (!date) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Daily schedule
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {formatDateHeading(date)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/appointments/new", {
                    state: { returnTo: `${location.pathname}${location.search}` },
                  });
                }}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                New
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="scrollbar-none max-h-[60vh] overflow-y-auto p-5">
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-medium text-slate-900">
                No appointments scheduled
              </p>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/appointments/new", {
                      state: { returnTo: `${location.pathname}${location.search}` },
                    });
                  }}
                  className="mt-3 text-sm font-medium text-sky-700 hover:underline"
                >
                  Create appointment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatTimeRange(
                        appointment.scheduledStart,
                        appointment.scheduledEnd
                      )}
                    </p>
                    <AppointmentStatusBadge status={appointment.status} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950 [overflow-wrap:anywhere]">
                        {appointment.patientName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 [overflow-wrap:anywhere]">
                        Dr. {appointment.doctorName}
                        {appointment.departmentName
                          ? `, ${appointment.departmentName}`
                          : ""}
                      </p>
                      {appointment.appointmentType && (
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          {appointment.appointmentType}
                        </p>
                      )}
                      {appointment.reason && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {appointment.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <AppointmentActions
                    appointment={appointment}
                    canManageStatus={canManageStatus}
                    canEdit={canEdit}
                    canVisit={canVisit}
                    encounterBasePath={encounterBasePath}
                    onMutated={onMutated}
                    onToast={onToast}
                    onClose={onClose}
                  />
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          {sorted.length} {sorted.length === 1 ? "appointment" : "appointments"}
        </div>
      </div>
    </div>
  );
}
