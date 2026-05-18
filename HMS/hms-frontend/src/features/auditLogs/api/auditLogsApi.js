import apiClient from "@/api/apiClient";

export async function fetchSystemAuditLogs(params = {}) {
  const response = await apiClient.get("/admin/audit-logs/system", {
    params,
  });

  return response.data;
}

export function getApiErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong."
  );
}
