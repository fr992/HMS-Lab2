import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7297/api";

const publicApi = axios.create({
  baseURL,
});

export async function fetchLandingDepartments({ pageSize = 6, all = false } = {}) {
  const { data } = await publicApi.get("/public/departments", {
    params: {
      page: 1,
      pageSize,
      all,
    },
  });

  return data;
}
