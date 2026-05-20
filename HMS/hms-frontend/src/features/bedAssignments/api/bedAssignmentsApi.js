import api from "@/api/apiClient";

export { getApiErrorMessage } from "@/features/patients/patientsApi";

export async function fetchBeds(filters = {}) {
  const params = {};
  if (filters.status && filters.status !== "all") params.status = filters.status;
  const departmentId = Number(filters.departmentId);
  if (
    filters.departmentId &&
    filters.departmentId !== "all" &&
    Number.isFinite(departmentId)
  ) {
    params.departmentId = departmentId;
  }

  const { data } = await api.get("/beds", { params });
  return Array.isArray(data) ? data : [];
}

export async function fetchActiveBedAssignments() {
  const { data } = await api.get("/beds/assignments/active");
  return Array.isArray(data) ? data : [];
}

export async function fetchDoctorDepartmentBeds() {
  const { data } = await api.get("/beds/department");
  return Array.isArray(data) ? data : [];
}

export async function assignBed(bedId, body) {
  const { data } = await api.post(`/beds/${bedId}/assign`, body);
  return data;
}

export async function releaseBedAssignment(assignmentId, body) {
  const { data } = await api.post(`/beds/assignments/${assignmentId}/release`, body);
  return data;
}

export async function releaseBed(bedId, body) {
  const { data } = await api.post(`/beds/${bedId}/release`, body);
  return data;
}

export async function fetchDepartmentsList() {
  const { data } = await api.get("/departments");
  return Array.isArray(data) ? data : [];
}
