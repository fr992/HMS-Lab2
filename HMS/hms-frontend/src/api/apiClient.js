import axios from "axios";
import { clearSession, getAccessToken } from "../auth/session";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7297/api";

const apiClient = axios.create({
  baseURL,
});

const STATUS_MESSAGES = {
  400: "Please check the information and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "We could not find the requested information.",
  409: "This action conflicts with existing information. Please review and try again.",
  422: "Some information is missing or invalid. Please review the highlighted fields.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again later.",
  502: "The server is temporarily unavailable. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly.",
  504: "The request took too long. Please try again shortly.",
};

function collectValidationMessages(errors) {
  if (!errors || typeof errors !== "object") return [];

  return Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .flatMap((value) => {
      if (typeof value === "string") return [value];
      if (value && typeof value === "object") return collectValidationMessages(value);
      return [];
    })
    .filter(Boolean);
}

function isTechnicalMessage(message) {
  return /request failed with status code|network error|timeout of \d+ms exceeded/i.test(message);
}

function cleanMessage(message) {
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (!trimmed || isTechnicalMessage(trimmed)) return null;
  return trimmed;
}

export function getFriendlyApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  const status = error?.response?.status;

  if (typeof data === "string") {
    const message = cleanMessage(data);
    if (message) return message;
  }

  if (data && typeof data === "object") {
    const validationMessages = collectValidationMessages(data.errors);
    if (validationMessages.length > 0) return validationMessages.join(" ");

    const message =
      cleanMessage(data.message) ||
      cleanMessage(data.error) ||
      cleanMessage(data.detail) ||
      cleanMessage(data.title);

    if (message) return message;
  }

  if (!error?.response) {
    return "Unable to reach the server. Please check your connection and try again.";
  }

  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];

  return cleanMessage(error?.message) || fallback;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const clinicalApi = {
  getEncounterPanel: (encounterId) =>
    apiClient.get(`/encounters/${encounterId}/panel`),
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? "");
    if (
      status === 401 &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/refresh")
    ) {
      clearSession();
      const redirectTo =
        window.sessionStorage.getItem("hms.logout.redirect") || "/login";
      window.sessionStorage.removeItem("hms.logout.redirect");
      window.location.assign(redirectTo);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
