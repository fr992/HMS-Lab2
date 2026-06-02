import apiClient, { getFriendlyApiErrorMessage } from "@/api/apiClient";

export function getDataTransferError(error) {
  return getFriendlyApiErrorMessage(error, "Data transfer failed. Please try again.");
}

export async function exportModule(endpoint, format, params = {}) {
  const response = await apiClient.get(`${endpoint}/export/${format}`, {
    params,
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const fallback = `${endpoint.split("/").pop()}_${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : format}`;
  const filename = match ? decodeURIComponent(match[1]) : fallback;
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function importModule(endpoint, format, file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post(`${endpoint}/import/${format}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
