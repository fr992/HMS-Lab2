import api from "@/api/apiClient";

export function getApiErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong."
  );
}

export async function fetchUserProfile() {
  const response = await api.get("/user-profile");
  return response.data;
}

export async function updateUserProfile(payload) {
  const response = await api.put("/user-profile", payload);
  return response.data;
}
