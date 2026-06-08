import axios from "axios";
import { API_BASE_URL } from "@/config/environment";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
});

export async function fetchLandingStats() {
  const { data } = await publicApi.get("/public/landing-stats");
  return data;
}
