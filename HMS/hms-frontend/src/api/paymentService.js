import apiClient from "@/api/apiClient";

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

export const PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  INSURANCE: "insurance",
  ONLINE: "online",
};

export async function listPayments({
  search,
  status,
  paymentMethod,
  fromDate,
  toDate,
  page = 1,
  pageSize = 25,
} = {}) {
  const params = { page, pageSize };

  if (search) params.search = search;
  if (status && status !== "all") params.status = status;
  if (paymentMethod && paymentMethod !== "all") params.paymentMethod = paymentMethod;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;

  const response = await apiClient.get("/payments", { params });
  return response.data;
}

export async function getPayment(id) {
  const response = await apiClient.get(`/payments/${id}`);
  return response.data;
}

export async function createPayment(payload) {
  const response = await apiClient.post("/payments", payload);
  return response.data;
}

export async function updatePaymentStatus(id, payload) {
  const response = await apiClient.patch(`/payments/${id}/status`, payload);
  return response.data;
}

export async function confirmCashPayment(id) {
  const response = await apiClient.post(`/payments/${id}/confirm-cash`);
  return response.data;
}

export function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.title === "string") return data.title;
  return error?.message || "Something went wrong. Please try again.";
}
