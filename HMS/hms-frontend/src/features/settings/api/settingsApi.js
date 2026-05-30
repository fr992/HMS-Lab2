import api, { getFriendlyApiErrorMessage } from "@/api/apiClient";

export function getApiErrorMessage(err) {
  return getFriendlyApiErrorMessage(err);
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
