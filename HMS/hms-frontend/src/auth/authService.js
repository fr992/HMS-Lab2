import api from "@/api/apiClient";
import { clearSession, setSessionTokens } from "./session";

export async function login(userNameOrEmail, password) {
  const response = await api.post("/auth/login", {
    userNameOrEmail,
    password,
  });

  const data = response.data;
  setSessionTokens(data.accessToken, data.refreshToken);
  return data;
}

export function logout() {
  clearSession();
}