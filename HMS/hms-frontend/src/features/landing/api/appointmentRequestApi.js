import apiClient from "@/api/apiClient";

export async function createAppointmentRequest(data) {
  const doctorProfileId = Number.parseInt(data.doctorProfileId, 10);
  const payload = {
    ...data,
    doctorProfileId: Number.isFinite(doctorProfileId) ? doctorProfileId : null,
  };
  const response = await apiClient.post("/appointment-requests", payload);
  return response.data;
}

export async function fetchPublicDoctors(params = {}) {
  const response = await apiClient.get("/public/doctors", { params });
  return response.data;
}
