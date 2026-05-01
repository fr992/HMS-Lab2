import api from "@/api/apiClient";
export { getApiErrorMessage } from "@/features/patients/patientsApi";

/**
 * @param {string} [dateISO] date-only ISO string for server filter
 */
/**
 * @param {object} body CreateAppointmentDto (camelCase)
 */
export async function createAppointment(body) {
  const { data } = await api.post("/receptionist/appointments", body);
  return data;
}

export async function fetchDepartmentsList() {
  const { data } = await api.get("/departments");
  return data;
}

export async function fetchAppointments(filters) {
  const params = {};
  if (typeof filters === "string") {
    if (filters) params.date = filters;
  } else if (filters) {
    if (filters.date) params.date = filters.date;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  const { data } = await api.get("/receptionist/appointments", { params });
  return data;
}

/**
 * @param {number} id
 */
export async function fetchAppointmentById(id) {
  const { data } = await api.get(`/receptionist/appointments/${id}`);
  return data;
}

/**
 * PATCH /api/receptionist/appointments/{id}/status. Payload matches backend DTO.
 * @param {number} id
 * @param {{ status: string, cancellationReason?: string }} payload
 */
export async function patchAppointmentStatus(id, payload) {
  const { data } = await api.patch(
    `/receptionist/appointments/${id}/status`,
    payload
  );
  return data;
}

/**
 * @param {number} id
 * @param {object} body UpdateAppointmentDto
 */
export async function updateAppointment(id, body) {
  const { data } = await api.put(`/receptionist/appointments/${id}`, body);
  return data;
}
