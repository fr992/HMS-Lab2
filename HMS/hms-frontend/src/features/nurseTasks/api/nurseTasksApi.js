import apiClient, { getFriendlyApiErrorMessage } from "@/api/apiClient";

export function getApiErrorMessage(error) {
  return getFriendlyApiErrorMessage(error);
}

export async function fetchNurseTasks(params = {}) {
  const { data } = await apiClient.get("/nurse-tasks/my", { params });
  return data;
}

export async function fetchNurseTasksByEncounter(encounterId) {
  const { data } = await apiClient.get(`/nurse-tasks/encounter/${encounterId}`);
  return Array.isArray(data) ? data : [];
}

export async function createNurseTask(payload) {
  const { data } = await apiClient.post("/nurse-tasks", payload);
  return data;
}

export async function updateNurseTask(id, payload) {
  const { data } = await apiClient.put(`/nurse-tasks/${id}`, payload);
  return data;
}

export async function completeNurseTask(id) {
  const { data } = await apiClient.post(`/nurse-tasks/${id}/complete`);
  return data;
}

export async function fetchNurses() {
  const { data } = await apiClient.get("/nurses");
  return Array.isArray(data) ? data : [];
}
