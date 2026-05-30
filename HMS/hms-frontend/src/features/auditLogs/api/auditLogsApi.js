import apiClient, { getFriendlyApiErrorMessage } from "@/api/apiClient";

export async function fetchSystemAuditLogs(params = {}) {
  const response = await apiClient.get("/admin/audit-logs/system", {
    params,
  });

  return response.data;
}

export function getApiErrorMessage(error) {
  return getFriendlyApiErrorMessage(error);
}
