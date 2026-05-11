import api from "@/api/apiClient";

export function getApiErrorMessage(err) {
  const data = err.response?.data;
  if (data && typeof data === "object") {
    if (data.message) return String(data.message);
    if (data.error) return String(data.error);
    if (data.title) return String(data.title);
  }
  if (err.message) return err.message;
  return "Request failed";
}

export async function fetchSettings(params = {}) {
  const query = {};
  if (params.search) query.search = params.search;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;

  const { data } = await api.get("/admin/settings", { params: query });
  return data;
}

export async function updateSetting(id, body) {
  const payload = {
    key: body.key,
    value: body.value,
    description: body.description?.trim() ? body.description.trim() : null,
  };

  const { data } = await api.put(`/admin/settings/${id}`, payload);
  return data;
}
