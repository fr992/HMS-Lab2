import apiClient from "@/api/apiClient";

export function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (data && typeof data === "object" && data.error) return String(data.error);
  return error?.message || "Request failed";
}

export async function fetchNurseTasks() {
  const { data } = await apiClient.get("/nurse-tasks/my");
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
