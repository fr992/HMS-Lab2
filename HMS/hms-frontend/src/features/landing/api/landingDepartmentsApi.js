import axios from "axios";
import { API_BASE_URL } from "@/config/environment";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
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
