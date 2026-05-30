import apiClient, { getFriendlyApiErrorMessage } from "@/api/apiClient";

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

export const PAYMENT_RETURN_TO_KEY = "hms.payment.returnTo";

export function rememberPaymentReturnPath() {
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.setItem(PAYMENT_RETURN_TO_KEY, path);
}

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

export async function createStripeCheckout(paymentId) {
  const response = await apiClient.post(`/stripe/checkout/${paymentId}`);
  return response.data;
}

export async function payInvoiceOnline(invoiceId) {
  const response = await apiClient.post("/me/payments/pay-online", { invoiceId });
  return response.data;
}

export async function confirmStripeCheckout(sessionId) {
  const response = await apiClient.post("/stripe/checkout/confirm", null, {
    params: { sessionId },
  });
  return response.data;
}

export function getApiErrorMessage(error) {
  return getFriendlyApiErrorMessage(error);
}
