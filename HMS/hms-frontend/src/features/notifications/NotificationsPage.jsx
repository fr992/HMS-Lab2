import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, Search, Trash2, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  clearAllNotifications,
  clearNotification,
  markAllRead,
  markRead,
} from "@/features/notifications/api/notificationsApi";
import {
  notificationQueryKeys,
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/hooks";
import {
  formatNotificationRelativeTime,
  notificationTypeDotClass,
} from "@/features/notifications/notificationPresentation";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const notificationsQuery = useNotifications();
  const unreadQuery = useUnreadNotificationCount();
  const notifications = useMemo(
    () => notificationsQuery.data ?? [],
    [notificationsQuery.data]
  );
  const unreadCount = Number(unreadQuery.data ?? 0);
  const userKey = auth.userId ?? auth.userName ?? "anonymous";
  const listQueryKey = notificationQueryKeys.list(userKey);
  const unreadQueryKey = notificationQueryKeys.unreadCount(userKey);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const dashboardPath = getDashboardPath(auth);

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listQueryKey }),
        queryClient.cancelQueries({ queryKey: unreadQueryKey }),
      ]);

      const previousNotifications = queryClient.getQueryData(listQueryKey);
      const previousCount = queryClient.getQueryData(unreadQueryKey);
      const target = previousNotifications?.find((item) => item.id === id);

      if (target && !target.isRead) {
        queryClient.setQueryData(listQueryKey, (current = []) =>
          current.map((item) =>
            item.id === id
              ? { ...item, isRead: true, readAt: new Date().toISOString() }
              : item
          )
        );
        queryClient.setQueryData(unreadQueryKey, (current = 0) =>
          Math.max(Number(current) - 1, 0)
        );
      }

      return { previousNotifications, previousCount };
    },
    onError: (_error, _id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(listQueryKey, context.previousNotifications);
      }
      if (typeof context?.previousCount === "number") {
        queryClient.setQueryData(unreadQueryKey, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadQueryKey });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listQueryKey }),
        queryClient.cancelQueries({ queryKey: unreadQueryKey }),
      ]);

      const previousNotifications = queryClient.getQueryData(listQueryKey);
      const previousCount = queryClient.getQueryData(unreadQueryKey);
      const readAt = new Date().toISOString();

      queryClient.setQueryData(listQueryKey, (current = []) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? readAt,
        }))
      );
      queryClient.setQueryData(unreadQueryKey, 0);

      return { previousNotifications, previousCount };
    },
    onError: (_error, _values, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(listQueryKey, context.previousNotifications);
      }
      if (typeof context?.previousCount === "number") {
        queryClient.setQueryData(unreadQueryKey, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadQueryKey });
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearNotification,
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listQueryKey }),
        queryClient.cancelQueries({ queryKey: unreadQueryKey }),
      ]);

      const previousNotifications = queryClient.getQueryData(listQueryKey);
      const previousCount = queryClient.getQueryData(unreadQueryKey);
      const target = previousNotifications?.find((item) => item.id === id);

      queryClient.setQueryData(listQueryKey, (current = []) =>
        current.filter((item) => item.id !== id)
      );

      if (target && !target.isRead) {
        queryClient.setQueryData(unreadQueryKey, (current = 0) =>
          Math.max(Number(current) - 1, 0)
        );
      }

      return { previousNotifications, previousCount };
    },
    onError: (_error, _id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(listQueryKey, context.previousNotifications);
      }
      if (typeof context?.previousCount === "number") {
        queryClient.setQueryData(unreadQueryKey, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadQueryKey });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: clearAllNotifications,
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listQueryKey }),
        queryClient.cancelQueries({ queryKey: unreadQueryKey }),
      ]);

      const previousNotifications = queryClient.getQueryData(listQueryKey);
      const previousCount = queryClient.getQueryData(unreadQueryKey);

      queryClient.setQueryData(listQueryKey, []);
      queryClient.setQueryData(unreadQueryKey, 0);

      return { previousNotifications, previousCount };
    },
    onError: (_error, _values, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(listQueryKey, context.previousNotifications);
      }
      if (typeof context?.previousCount === "number") {
        queryClient.setQueryData(unreadQueryKey, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadQueryKey });
    },
  });

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !notification.isRead) ||
        (filter === "read" && notification.isRead);

      if (!matchesFilter) return false;
      if (!term) return true;

      return [
        notification.title,
        notification.message,
        notification.type,
        notification.relatedEntityType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [filter, notifications, search]);

  const pageCount = Math.max(Math.ceil(filteredNotifications.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredNotifications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleFilterChange(value) {
    setFilter(value);
    setPage(1);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  return (
    <div className="flex min-h-full flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            to={dashboardPath}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Go back to dashboard
          </Link>
          <p className="text-sm font-medium text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Notifications
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={unreadCount === 0 || markAllMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-500"
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </button>
          <button
            type="button"
            onClick={() => clearAllMutation.mutate()}
            disabled={notifications.length === 0 || clearAllMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 disabled:pointer-events-none disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Trash2 className="size-4" />
            Clear all
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search notifications"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFilterChange(option.value)}
                className={[
                  "h-8 rounded px-3 text-sm font-semibold transition",
                  filter === option.value
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {notificationsQuery.isLoading ? (
          <NotificationPageLoading />
        ) : pageItems.length === 0 ? (
          <NotificationPageEmpty />
        ) : (
          <div className="divide-y divide-slate-100">
            {pageItems.map((notification) => (
              <NotificationPageItem
                key={notification.id}
                notification={notification}
                onClick={() => {
                  if (!notification.isRead) {
                    markReadMutation.mutate(notification.id);
                  }
                }}
                onClear={() => clearMutation.mutate(notification.id)}
                clearing={clearMutation.isPending}
              />
            ))}
          </div>
        )}

        {filteredNotifications.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:text-slate-300"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(value + 1, pageCount))}
                disabled={currentPage === pageCount}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function getDashboardPath(auth) {
  if (auth.hasRole("Doctor")) return "/doctor/dashboard";
  if (auth.hasRole("Patient")) return "/patient/dashboard";
  if (auth.hasRole("Nurse") || auth.hasRole("Infermier")) return "/nurse/dashboard";
  if (auth.hasRole("Admin") || auth.hasRole("SuperAdmin")) return "/admin/dashboard";

  return "/staff/dashboard";
}

function NotificationPageItem({ notification, onClick, onClear, clearing }) {
  const dotClass = notificationTypeDotClass[notification.type] ?? "bg-slate-400";

  return (
    <div
      className={[
        "grid grid-cols-[1fr_auto] items-start transition hover:bg-slate-50",
        notification.isRead ? "bg-white" : "bg-blue-50/45",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onClick}
        className="grid w-full min-w-0 grid-cols-[0.9rem_1fr_auto] gap-3 px-4 py-4 text-left"
      >
        <span className={`mt-1.5 size-2.5 rounded-full ${notification.isRead ? "bg-slate-300" : dotClass}`} />
        <span className="min-w-0">
          <span
            className={[
              "block text-sm text-slate-950",
              notification.isRead ? "font-medium" : "font-semibold",
            ].join(" ")}
          >
            {notification.title || "Notification"}
          </span>
          <span className="mt-1 block text-sm leading-5 text-slate-600">
            {notification.message || "-"}
          </span>
          <span className="mt-2 block text-xs font-medium text-slate-400">
            {formatNotificationRelativeTime(notification.createdAt)}
          </span>
        </span>
        <span
          className={[
            "hidden h-6 items-center justify-center self-start whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex",
            notification.isRead
              ? "bg-slate-50 text-slate-500 ring-slate-200"
              : "bg-blue-50 text-blue-700 ring-blue-200",
          ].join(" ")}
        >
          {notification.isRead ? "Read" : "Unread"}
        </span>
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={clearing}
        className="mr-4 mt-4 inline-flex size-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Clear notification"
        title="Clear notification"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function NotificationPageEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Bell className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-950">
        No notifications yet
      </p>
    </div>
  );
}

function NotificationPageLoading() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid animate-pulse grid-cols-[0.9rem_1fr] gap-3 rounded-md p-2">
          <div className="mt-1.5 size-2.5 rounded-full bg-slate-200" />
          <div>
            <div className="h-3 w-48 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-full max-w-xl rounded bg-slate-100" />
            <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
