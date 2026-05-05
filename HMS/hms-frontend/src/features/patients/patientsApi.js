import api from "@/api/apiClient";

/**
 * @param {import("axios").AxiosError} err
 */
export function getApiErrorMessage(err) {
  const d = err.response?.data;
  if (d && typeof d === "object" && "error" in d && d.error) {
    return String(d.error);
  }
  if (err.message) return err.message;
  return "Request failed";
}

export async function fetchPatients() {
  const { data } = await api.get("/patients");
  return data;
}

export async function fetchDoctorPatientsGrouped() {
  const { data } = await api.get("/clinical/doctor/patients/grouped");
  return data;
}

/**
 * Optional list for primary doctor assignment. Backend may expose `GET /api/doctors` later.
 * @returns {Promise<{ id: number, fullName: string }[] | unknown>}
 */
export async function fetchDoctorsList() {
  const { data } = await api.get("/doctors");
  return data;
}

/**
 * @param {number} id
 */
export async function fetchPatientById(id) {
  const { data } = await api.get(`/patients/${id}`);
  return data;
}

/**
 * @param {object} body register DTO
 */
export async function registerPatient(body) {
  const { data } = await api.post("/patients/register", body);
  return data;
}

/**
 * @param {number} id
 * @param {object} body update DTO
 */
export async function updatePatient(id, body) {
  const { data } = await api.put(`/patients/${id}`, body);
  return data;
}

/**
 * @param {number} id patient profile id
 * @param {{ userName: string, email: string, password: string }} body
 */
export async function linkPatientPortal(id, body) {
  const { data } = await api.post(`/patients/${id}/portal`, body);
  return data;
}

/**
 * @param {number} id
 */
export async function deletePatient(id) {
  await api.delete(`/patients/${id}`);
}

/**
 * @param {number} patientId
 */
export async function fetchPatientContacts(patientId) {
  const { data } = await api.get(`/patients/${patientId}/contacts`);
  return data;
}

/**
 * @param {number} patientId
 * @param {object[]} contacts
 */
export async function putPatientContacts(patientId, contacts) {
  await api.put(`/patients/${patientId}/contacts`, contacts);
}
