import api from "@/api/apiClient";
export { getApiErrorMessage } from "@/patients/patientsApi";

/**
 * @param {string} [dateISO] date-only ISO string for server filter
 */
/**
 * @param {object} body — CreateAppointmentDto (camelCase)
 */
export async function createAppointment(body) {
  const { data } = await api.post("/receptionist/appointments", body);
  return data;
}

export async function fetchDepartmentsList() {
  const { data } = await api.get("/departments");
  return data;
}

export async function fetchAppointments(dateISO) {
  const params = {};
  if (dateISO) params.date = dateISO;
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
 * PATCH /api/receptionist/appointments/{id}/status — payload matches backend DTO.
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
