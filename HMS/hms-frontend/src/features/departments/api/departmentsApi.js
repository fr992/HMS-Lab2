import api from "@/api/apiClient";
import { getApiErrorMessage } from "@/features/patients/patientsApi";

export { getApiErrorMessage };

export async function fetchDepartmentsList() {
  const { data } = await api.get("/departments");
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminDepartments() {
  const { data } = await api.get("/admin/departments");
  return Array.isArray(data) ? data : [];
}

export async function createDepartment(body) {
  const payload = {
    name: body.name,
    description: body.description?.trim() ? body.description.trim() : null,
  };

  const { data } = await api.post("/admin/departments", payload);
  return data;
}

export async function updateDepartment(id, body) {
  const payload = {
    name: body.name,
    description: body.description?.trim() ? body.description.trim() : null,
  };

  const { data } = await api.put(`/admin/departments/${id}`, payload);
  return data;
}

export async function deleteDepartment(id) {
  await api.delete(`/admin/departments/${id}`);
}
