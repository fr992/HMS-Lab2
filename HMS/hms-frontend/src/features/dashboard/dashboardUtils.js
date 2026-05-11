export function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.title === "string") return data.title;
  return error?.message || "Request failed";
}

export function getPagedItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function getTotalCount(data) {
  if (Array.isArray(data)) return data.length;
  const value = Number(data?.totalCount ?? data?.items?.length ?? data?.data?.length);
  return Number.isFinite(value) ? value : 0;
}

export function keyOf(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(value, currency = "EUR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`.trim();
  }
}

export function isUpcomingAppointment(appointment) {
  const date = new Date(appointment?.scheduledStart);
  if (Number.isNaN(date.getTime()) || date < new Date()) return false;
  const status = keyOf(appointment?.status);
  return !["cancelled", "completed", "no_show"].includes(status);
}

export function initials(name, fallback = "U") {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return fallback.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
