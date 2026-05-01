import apiClient from "@/api/apiClient";

export async function createAppointmentRequest(data) {
  const response = await apiClient.post("/appointment-requests", data);
  return response.data;
}
