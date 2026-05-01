import { APPOINTMENT_STATUS } from "./appointmentConstants";

/**
 * Action model aligned with domain `AppointmentStatus` rules and product UX.
 * @typedef {{ id: string, label: string, kind: "status" | "cancel" | "view" | "edit", target?: string }} AppointmentRowAction
 */

/** @type {Record<string, AppointmentRowAction[]>} */
const byStatus = {
  [APPOINTMENT_STATUS.SCHEDULED]: [
    {
      id: "confirm",
      label: "Confirm",
      kind: "status",
      target: APPOINTMENT_STATUS.CONFIRMED,
    },
    { id: "cancel", label: "Cancel", kind: "cancel" },
    {
      id: "no_show",
      label: "Mark no show",
      kind: "status",
      target: APPOINTMENT_STATUS.NO_SHOW,
    },
    { id: "edit", label: "Edit", kind: "edit" },
    { id: "view", label: "View", kind: "view" },
  ],
  [APPOINTMENT_STATUS.CONFIRMED]: [
    {
      id: "complete",
      label: "Complete",
      kind: "status",
      target: APPOINTMENT_STATUS.COMPLETED,
    },
    { id: "cancel", label: "Cancel", kind: "cancel" },
    {
      id: "no_show",
      label: "Mark no show",
      kind: "status",
      target: APPOINTMENT_STATUS.NO_SHOW,
    },
    { id: "edit", label: "Edit", kind: "edit" },
    { id: "view", label: "View", kind: "view" },
  ],
  [APPOINTMENT_STATUS.COMPLETED]: [
    { id: "view", label: "View", kind: "view" },
  ],
  [APPOINTMENT_STATUS.CANCELLED]: [
    { id: "view", label: "View", kind: "view" },
  ],
  [APPOINTMENT_STATUS.NO_SHOW]: [
    { id: "cancel", label: "Cancel", kind: "cancel" },
    { id: "view", label: "View", kind: "view" },
  ],
};

/**
 * @param {string} status
 * @returns {AppointmentRowAction[]}
 */
export function getAppointmentRowActions(status) {
  const key = String(status ?? "").trim().toLowerCase();
  return byStatus[key] ?? [{ id: "view", label: "View", kind: "view" }];
}

/**
 * @param {AppointmentRowAction} action
 * @param {{ canManageStatus: boolean, canEdit: boolean }} perms
 */
export function isAppointmentActionVisible(action, perms) {
  if (action.kind === "status" || action.kind === "cancel")
    return perms.canManageStatus;
  if (action.kind === "edit") return perms.canEdit;
  return true;
}
