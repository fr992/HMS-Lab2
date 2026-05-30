import api, { getFriendlyApiErrorMessage } from "@/api/apiClient";

export function getApiErrorMessage(error) {
  return getFriendlyApiErrorMessage(error);
}

export async function fetchUserProfile() {
  const response = await api.get("/user-profile");
  return response.data;
}

export async function updateUserProfile(payload) {
  const response = await api.put("/user-profile", payload);
  return response.data;
}
