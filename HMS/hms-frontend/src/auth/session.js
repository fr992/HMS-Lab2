/** Keys and helpers for auth tokens in localStorage (keeps apiClient free of authService circular imports). */
export const AUTH_KEYS = {
  access: "accessToken",
  refresh: "refreshToken",
};

export function getAccessToken() {
  return localStorage.getItem(AUTH_KEYS.access);
}

export function setSessionTokens(accessToken, refreshToken) {
  localStorage.setItem(AUTH_KEYS.access, accessToken);
  localStorage.setItem(AUTH_KEYS.refresh, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEYS.access);
  localStorage.removeItem(AUTH_KEYS.refresh);
}

export function hasSession() {
  return !!getAccessToken();
}
