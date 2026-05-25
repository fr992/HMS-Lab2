import apiClient from "@/api/apiClient";

export async function fetchMyAppointments() {
  const response = await apiClient.get("/patients/me/appointments");
  return response.data;
}

export async function fetchMyInvoices({ page = 1, pageSize = 25 } = {}) {
  const response = await apiClient.get("/me/invoices", {
    params: { page, pageSize },
  });
  return response.data;
}

export async function fetchMyLabResults() {
  const response = await apiClient.get("/me/lab-results");
  return response.data;
}

export async function downloadMyLabResultAttachment(id) {
  const response = await apiClient.get(`/me/lab-results/${id}/download`, {
    responseType: "blob",
  });
  return response;
}
