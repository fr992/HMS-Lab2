import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  getAppointmentRowActions,
  isAppointmentActionVisible,
} from "@/features/appointments/appointmentRowActionModel";
import {
  patchAppointmentStatus,
  getApiErrorMessage,
  openOrCreateEncounterFromAppointment,
} from "@/features/appointments/api/appointmentsApi";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";
import AppointmentCancelModal from "@/features/appointments/components/AppointmentCancelModal";

const MENU_W = 192;
const ROW_PX = 40;
const PAD_PX = 8;

/**
 * @param {object} props
 * @param {object} props.appointment — AppointmentDto
 * @param {boolean} props.canManageStatus
 * @param {boolean} props.canEdit
 * @param {boolean} props.canVisit
 * @param {string} props.encounterBasePath
 * @param {() => Promise<void>} props.onMutated — refetch list
 * @param {(msg: string, type?: 'success'|'error') => void} props.onToast
 */
export default function AppointmentRowActions({
  appointment,
  canManageStatus,
  canEdit,
  canVisit,
  encounterBasePath,
  onMutated,
  onToast,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [mutating, setMutating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const nudgedForOpenRef = useRef(false);

  const perms = { canManageStatus, canEdit, canVisit };
  const allActions = getAppointmentRowActions(appointment.status);
  const actions = allActions.filter((a) => isAppointmentActionVisible(a, perms));

  const runStatusPatch = async (target) => {
    if (mutating) return;
    setMutating(true);
    setOpen(false);
    try {
      await patchAppointmentStatus(appointment.id, { status: target });
      onToast("Status updated.", "success");
      await onMutated();
    } catch (e) {
      onToast(getApiErrorMessage(e), "error");
    } finally {
      setMutating(false);
    }
  };

  const handleAction = (action) => {
    if (action.kind === "view") {
      setOpen(false);
      navigate(`/appointments/${appointment.id}`);
      return;
    }
    if (action.kind === "edit") {
      setOpen(false);
      navigate(`/appointments/${appointment.id}/edit`);
      return;
    }
    if (action.kind === "visit") {
      setOpen(false);
      void (async () => {
        if (mutating) return;
        setMutating(true);
        try {
          const encounter = await openOrCreateEncounterFromAppointment(appointment);
          navigate(`${encounterBasePath}/${encounter.id}`);
        } catch (e) {
          onToast(getApiErrorMessage(e), "error");
        } finally {
          setMutating(false);
        }
      })();
      return;
    }
    if (action.kind === "cancel") {
      setOpen(false);
      setCancelError("");
      setCancelOpen(true);
      return;
    }
    if (action.kind === "status" && action.target) {
      void runStatusPatch(action.target);
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
      onToast("Appointment cancelled.", "success");
      setCancelOpen(false);
      await onMutated();
    } catch (e) {
      setCancelError(getApiErrorMessage(e));
    } finally {
      setMutating(false);
    }
  };

  useLayoutEffect(() => {
    if (!open) {
      nudgedForOpenRef.current = false;
      setPos(null);
      return;
    }
    const el = buttonRef.current;
    if (!el) return;
    const n = actions.length;
    if (n < 1) return;

    const r = el.getBoundingClientRect();
    const menuH = PAD_PX * 2 + n * ROW_PX;
    const gap = 4;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const margin = 8;

    nudgedForOpenRef.current = false;
    let top = r.bottom + gap;
    if (r.bottom + gap + menuH > vh - margin && r.top - gap - menuH > margin) {
      top = r.top - gap - menuH;
    }
    if (top + menuH > vh - margin) {
      top = Math.max(margin, vh - margin - menuH);
    }
    if (top < margin) top = margin;

    let left = r.right - MENU_W;
    if (left < margin) left = margin;
    if (left + MENU_W > vw - margin) {
      left = Math.max(margin, vw - MENU_W - margin);
    }

    setPos({ top, left });
  }, [open, actions.length]);

  useLayoutEffect(() => {
    if (!open || !pos || nudgedForOpenRef.current) return;
    const menu = menuRef.current;
    if (!menu) return;
    const m = menu.getBoundingClientRect();
    const vh = window.innerHeight;
    if (m.bottom <= vh - 4) return;
    nudgedForOpenRef.current = true;
    const nudge = m.bottom - (vh - 4);
    setPos((p) =>
      p ? { left: p.left, top: Math.max(4, p.top - nudge) } : p
    );
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", close, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", close, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (actions.length < 1) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const menu =
    open && pos
      ? createPortal(
          <ul
            ref={menuRef}
            className="pointer-events-auto fixed m-0 list-none p-0 text-slate-900 [z-index:200] w-48 min-w-48 max-w-48 rounded-lg border border-slate-200/90 bg-white py-1.5 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
            role="menu"
          >
            {actions.map((action) => {
              const danger = action.id === "cancel";
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    className={
                      danger
                        ? "w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                        : "w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-100"
                    }
                    role="menuitem"
                    disabled={mutating}
                    onClick={() => handleAction(action)}
                  >
                    {action.label}
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
      <div className="flex justify-end">
        <button
          type="button"
          ref={buttonRef}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          aria-label="Appointment actions"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={mutating}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <span className="text-lg leading-none">&#8942;</span>
        </button>
      </div>
      {menu}

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
