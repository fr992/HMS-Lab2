import apiClient from "@/api/apiClient";

export const encountersApi = {
  getPanel: (encounterId) =>
    apiClient.get(`/encounters/${encounterId}/panel`),

  createDiagnosis: (encounterId, payload) =>
    apiClient.post(`/encounters/${encounterId}/diagnoses`, payload),

  updateEncounter: (encounterId, payload) =>
    apiClient.put(`/encounters/${encounterId}`, payload),

  createPrescription: (encounterId, payload) =>
    apiClient.post(`/encounters/${encounterId}/prescriptions`, payload),

  closeEncounter: (encounterId) =>
    apiClient.post(`/encounters/${encounterId}/close`),
};
