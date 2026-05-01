import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";

export function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function isActiveForConflict(status) {
  return String(status).toLowerCase() !== APPOINTMENT_STATUS.CANCELLED;
}

