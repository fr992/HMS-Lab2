import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7297/api";

const publicApi = axios.create({
  baseURL,
});

export async function fetchPublicSettings() {
  const { data } = await publicApi.get("/public/settings");
  return data;
}
