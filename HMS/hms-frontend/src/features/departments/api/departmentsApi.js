import api from "@/api/apiClient";
import { getApiErrorMessage } from "@/features/patients/patientsApi";

export { getApiErrorMessage };

export async function fetchDepartmentsList(params = {}) {
  const query = {
    all: params.all ?? true,
  };
  if (params.search) query.search = params.search;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;

  const { data } = await api.get("/departments", { params: query });
  return query.all ? (Array.isArray(data) ? data : data?.items ?? []) : data;
}

export async function fetchAdminDepartments(params = {}) {
  const query = {};
  if (params.all !== undefined) query.all = params.all;
  if (params.search) query.search = params.search;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;

  const { data } = await api.get("/admin/departments", { params: query });
  return query.all ? (Array.isArray(data) ? data : data?.items ?? []) : data;
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
