import apiClient, { getFriendlyApiErrorMessage } from "@/api/apiClient";

export function getApiErrorMessage(error) {
  return getFriendlyApiErrorMessage(error);
}

export function getOverviewItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function getOverviewTotal(data) {
  if (Number.isFinite(data?.totalCount)) return data.totalCount;
  if (Number.isFinite(data?.TotalCount)) return data.TotalCount;
  return getOverviewItems(data).length;
}

export async function fetchStaffOverviewData() {
  const requests = {
    alerts: apiClient.get("/dashboard/alerts", { params: { limit: 12 } }),
    nurseTasks: apiClient.get("/nurse-tasks/my", { params: { page: 1, pageSize: 25 } }),
    paymentsAll: apiClient.get("/payments", { params: { page: 1, pageSize: 8 } }),
    paymentsPending: apiClient.get("/payments", {
      params: { status: "pending", page: 1, pageSize: 8 },
    }),
    paymentsPaid: apiClient.get("/payments", {
      params: { status: "paid", page: 1, pageSize: 8 },
    }),
    paymentsFailed: apiClient.get("/payments", {
      params: { status: "failed", page: 1, pageSize: 8 },
    }),
    paymentsCancelled: apiClient.get("/payments", {
      params: { status: "cancelled", page: 1, pageSize: 8 },
    }),
    labResults: apiClient.get("/lab-results", { params: { page: 1, pageSize: 25 } }),
    labRequests: apiClient.get("/lab/requests", {
      params: { page: 1, pageSize: 8 },
    }),
    labRequestsRequested: apiClient.get("/lab/requests", {
      params: { status: "requested", page: 1, pageSize: 8 },
    }),
    labRequestsSampleCollected: apiClient.get("/lab/requests", {
      params: { status: "sample_collected", page: 1, pageSize: 8 },
    }),
    labRequestsInProgress: apiClient.get("/lab/requests", {
      params: { status: "in_progress", page: 1, pageSize: 8 },
    }),
    labRequestsCompleted: apiClient.get("/lab/requests", {
      params: { status: "completed", page: 1, pageSize: 8 },
    }),
  };

  const entries = Object.entries(requests);
  const settled = await Promise.allSettled(entries.map(([, request]) => request));

  return entries.reduce((result, [key], index) => {
    const item = settled[index];
    result[key] =
      item.status === "fulfilled"
        ? { ok: true, data: item.value.data }
        : { ok: false, error: getApiErrorMessage(item.reason) };
    return result;
  }, {});
}
