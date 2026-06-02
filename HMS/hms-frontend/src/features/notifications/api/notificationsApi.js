import apiClient from "@/api/apiClient";

export async function getMyNotifications(params = {}) {
  const { data } = await apiClient.get("/notifications/me", { params });
  return Array.isArray(data) ? data : data?.items ?? [];
}

export async function getMyNotificationsPage(params = {}) {
  const { data } = await apiClient.get("/notifications/me", { params });
  return data;
}

export async function getUnreadCount() {
  const { data } = await apiClient.get("/notifications/me/unread-count");
  return Number(data?.count ?? 0);
}

export async function markRead(id) {
  await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllRead() {
  await apiClient.post("/notifications/me/read-all");
}

export async function clearNotification(id) {
  await apiClient.post(`/notifications/${id}/clear`);
}

export async function clearAllNotifications() {
  await apiClient.post("/notifications/me/clear");
}
