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
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;

  const { data } = await api.get("/appointment-requests", { params });
  return data;
}

/**
 * @param {number} id
 * @param {string} status
 * @param {number | null | undefined} doctorProfileId
 */
export async function patchAppointmentRequestStatus(id, status, doctorProfileId) {
  const { data } = await api.patch(`/appointment-requests/${id}/status`, {
    status,
    doctorProfileId,
  });
  return data;
}
