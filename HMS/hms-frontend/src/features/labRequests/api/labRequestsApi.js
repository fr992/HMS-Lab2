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
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;

  const { data } = await apiClient.get("/lab/requests", { params });
  return data;
}

export async function fetchLabRequestDetails(requestNumber, id) {
  const { data } = await apiClient.get("/lab/requests", {
    params: {
      search: requestNumber,
      pageSize: 25,
    },
  });

  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

  return items.find((item) => Number(item.id) === Number(id)) ?? null;
}

export async function createLabResult(body) {
  const form = new FormData();
  form.append("LabRequestItemId", String(body.labRequestItemId));
  form.append("ResultData", body.resultData);

  if (body.referenceRange?.trim()) {
    form.append("ReferenceRange", body.referenceRange.trim());
  }
  if (body.interpretation?.trim()) {
    form.append("Interpretation", body.interpretation.trim());
  }
  if (body.attachment) {
    form.append("Attachment", body.attachment);
  }

  const { data } = await apiClient.post("/lab/results", form);
  return data;
}

export async function updateLabResult(id, body) {
  const payload = new FormData();
  payload.append("ResultData", body.resultData);

  if (body.referenceRange?.trim()) {
    payload.append("ReferenceRange", body.referenceRange.trim());
  }
  if (body.interpretation?.trim()) {
    payload.append("Interpretation", body.interpretation.trim());
  }
  if (body.removeAttachment) {
    payload.append("RemoveAttachment", "true");
  }
  if (body.attachment) {
    payload.append("Attachment", body.attachment);
  }

  const { data } = await apiClient.put(`/lab/results/${id}`, payload);
  return data;
}

export async function publishLabResult(id) {
  const { data } = await apiClient.post(`/lab/results/${id}/publish`);
  return data;
}
