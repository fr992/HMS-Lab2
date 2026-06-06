import api from "@/api/apiClient";
import { getApiErrorMessage } from "@/features/patients/patientsApi";
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
  const { data } = await api.get("/departments", { params: { all: true } });
  return Array.isArray(data) ? data : data?.items ?? [];
}

export async function fetchAppointments(filters) {
  const params = {};
  if (typeof filters === "string") {
    if (filters) params.date = filters;
  } else if (filters) {
    if (filters.date) params.date = filters.date;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.search) params.search = filters.search;
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.pageSize) params.pageSize = filters.pageSize;
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

export async function createEncounterFromAppointment(appointment) {
  const payload = {
    patientProfileId: Number(appointment.patientProfileId),
    doctorProfileId: Number(appointment.doctorProfileId),
    appointmentId: Number(appointment.id),
    encounterType: "outpatient",
    startedAt: new Date().toISOString(),
    notes: appointment.reason ?? null,
  };

  const { data } = await api.post("/encounters", payload);
  return data;
}

export async function fetchEncounterByAppointment(appointment) {
  if (appointment?.encounterId) return { id: appointment.encounterId };

  const { data } = await api.get("/encounters", {
    params: {
      patientProfileId: Number(appointment.patientProfileId),
      doctorProfileId: Number(appointment.doctorProfileId),
    },
  });

  if (!Array.isArray(data)) return null;

  return (
    data.find((encounter) => Number(encounter.appointmentId) === Number(appointment.id)) ??
    null
  );
}

export async function openOrCreateEncounterFromAppointment(appointment) {
  const existing = await fetchEncounterByAppointment(appointment);
  if (existing?.id) return existing;

  try {
    return await createEncounterFromAppointment(appointment);
  } catch (error) {
    const message = getApiErrorMessage(error).toLowerCase();
    if (!message.includes("already has an encounter")) throw error;

    const linked = await fetchEncounterByAppointment(appointment);
    if (linked?.id) return linked;

    throw error;
  }
}
