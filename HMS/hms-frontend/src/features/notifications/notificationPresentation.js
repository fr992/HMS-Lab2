export const notificationTypeDotClass = {
  appointment: "bg-blue-500",
  lab_request: "bg-amber-500",
  payment: "bg-emerald-500",
  nurse_task: "bg-violet-500",
};

export function formatNotificationRelativeTime(value) {
  if (!value) return "";

  const date = parseNotificationDate(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 30_000) return "Just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  if (hours < 24 * 7) return `${Math.floor(hours / 24)}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function parseNotificationDate(value) {
  if (typeof value !== "string") return new Date(value);

  const trimmed = value.trim();
  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}T/.test(trimmed);

  return new Date(looksLikeDateTime && !hasTimeZone ? `${trimmed}Z` : trimmed);
}
