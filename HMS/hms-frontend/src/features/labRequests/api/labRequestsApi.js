import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/features/labtests/api/labTests";

export { getApiErrorMessage };

export const LAB_REQUEST_STATUS = {
  REQUESTED: "requested",
  SAMPLE_COLLECTED: "sample_collected",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export async function fetchLabRequests(filters = {}) {
  const params = {};
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }

  const { data } = await apiClient.get("/lab/requests", { params });
  return data;
}

export async function updateLabRequestStatus(id, status) {
  const { data } = await apiClient.patch(`/lab/requests/${id}/status`, {
    status,
  });
  return data;
}
