import axios from "axios";
import { API_BASE_URL } from "@/config/environment";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
});

export async function fetchPublicSettings() {
  const { data } = await publicApi.get("/public/settings");
  return data;
}
