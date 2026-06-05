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

export async function fetchSettingsUntilKeys(expectedKeys, params = {}) {
  const wanted = new Set(expectedKeys);
  const itemsByKey = new Map();
  let page = params.page ?? 1;
  let totalPages = 1;

  do {
    const data = await fetchSettings({ ...params, page, pageSize: params.pageSize ?? 100 });
    const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];

    for (const item of items) {
      if (item?.key) itemsByKey.set(item.key, item);
    }

    totalPages = Number(data?.totalPages ?? page);
    const hasAllExpected = [...wanted].every((key) => itemsByKey.has(key));
    if (hasAllExpected || !data?.hasNextPage) break;
    page += 1;
  } while (page <= totalPages);

  return { items: [...itemsByKey.values()] };
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

export async function uploadLogoSetting(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/settings/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}
