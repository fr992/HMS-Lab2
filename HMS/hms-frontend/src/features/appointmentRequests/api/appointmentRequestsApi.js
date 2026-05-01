import api from "@/api/apiClient";
export { getApiErrorMessage } from "@/features/patients/patientsApi";

export const APPOINTMENT_REQUEST_STATUS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

/**
 * @param {{ status?: string, preferredDate?: string }} filters
 */
export async function fetchAppointmentRequests(filters = {}) {
  const params = {};
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.preferredDate) params.preferredDate = filters.preferredDate;

  const { data } = await api.get("/appointment-requests", { params });
  return data;
}

/**
 * @param {number} id
 * @param {string} status
 */
export async function patchAppointmentRequestStatus(id, status) {
  const { data } = await api.patch(`/appointment-requests/${id}/status`, {
    status,
  });
  return data;
}
