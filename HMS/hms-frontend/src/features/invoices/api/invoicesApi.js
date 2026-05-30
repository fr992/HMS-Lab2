import apiClient, { getFriendlyApiErrorMessage } from "@/api/apiClient";

export const INVOICE_STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  PAID: "paid",
  PARTIALLY_PAID: "partially_paid",
  CANCELLED: "cancelled",
};

export async function fetchInvoices({ status, search, page = 1, pageSize = 25 } = {}) {
  const params = {
    page,
    pageSize,
  };

  if (status && status !== "all") params.status = status;
  if (search) params.search = search;

  const response = await apiClient.get("/invoices", { params });
  return response.data;
}

export async function fetchInvoiceById(id) {
  const response = await apiClient.get(`/invoices/${id}`);
  return response.data;
}

export async function createInvoice(payload) {
  const response = await apiClient.post("/invoices", payload);
  return response.data;
}

export function getApiErrorMessage(error) {
  return getFriendlyApiErrorMessage(error);
}
