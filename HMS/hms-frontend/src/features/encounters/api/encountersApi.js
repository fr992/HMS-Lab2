import apiClient from "@/api/apiClient";

export const encountersApi = {
  getPanel: (encounterId) =>
    apiClient.get(`/encounters/${encounterId}/panel`),

  getPatientEncounterPanel: (encounterId) =>
    apiClient.get(`/encounters/${encounterId}/patient-panel`),

  getPatientEncounters: () =>
    apiClient.get("/encounters/patient"),

  getActiveMedications: () =>
    apiClient.get("/admin/medications", { params: { isActive: true } }),

  getActiveLabTests: () =>
    apiClient.get("/admin/lab-tests", { params: { isActive: true } }),

  createDiagnosis: (encounterId, payload) =>
    apiClient.post(`/encounters/${encounterId}/diagnoses`, payload),

  updateEncounter: (encounterId, payload) =>
    apiClient.put(`/encounters/${encounterId}`, payload),

  createPrescription: (encounterId, payload) =>
    apiClient.post(`/encounters/${encounterId}/prescriptions`, payload),

  createLabRequest: (encounterId, payload) =>
    apiClient.post(`/encounters/${encounterId}/lab-requests`, payload),

  closeEncounter: (encounterId) =>
    apiClient.post(`/encounters/${encounterId}/close`),
};
