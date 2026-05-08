import api from "@/api/apiClient";
import { getApiErrorMessage } from "@/features/patients/patientsApi";

export { getApiErrorMessage };

/**
 * @param {{ isActive?: boolean | "all" }} [params]
 */
export async function fetchMedications(params = {}) {
  const query = {};
  if (params.isActive !== undefined && params.isActive !== "all") {
    query.isActive = params.isActive;
  }
  if (params.search) query.search = params.search;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;

  const { data } = await api.get("/admin/medications", { params: query });
  return data;
}

/**
 * @param {{ name: string, description?: string | null }} body
 */
export async function createMedication(body) {
  const payload = {
    name: body.name,
    description: body.description?.trim() ? body.description.trim() : null,
  };

  const { data } = await api.post("/admin/medications", payload);
  return data;
}

/**
 * @param {number} id
 * @param {{ name: string, description?: string | null, isActive: boolean }} body
 */
export async function updateMedication(id, body) {
  const payload = {
    name: body.name,
    description: body.description?.trim() ? body.description.trim() : null,
    isActive: Boolean(body.isActive),
  };

  const { data } = await api.put(`/admin/medications/${id}`, payload);
  return data;
}

/**
 * Backend delete is a soft-delete (sets IsActive=false).
 * @param {number} id
 */
export async function deactivateMedication(id) {
  await api.delete(`/admin/medications/${id}`);
}
