import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
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

const DROPDOWN_PREVIEW_COUNT = 8;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const queryClient = useQueryClient();
  const auth = useAuth();
  const userKey = auth.userId ?? auth.userName ?? "anonymous";
  const listQueryKey = notificationQueryKeys.list(userKey);
  const unreadQueryKey = notificationQueryKeys.unreadCount(userKey);
  const notificationsQuery = useNotifications();
  const unreadQuery = useUnreadNotificationCount();
  const notifications = notificationsQuery.data ?? [];
  const previewNotifications = notifications.slice(0, DROPDOWN_PREVIEW_COUNT);
  const unreadCount = Number(unreadQuery.data ?? 0);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
        current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? readAt }))
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

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Notifications"
        aria-expanded={open}
        title="Notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold leading-none text-white ring-2 ring-white">
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-120 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-950/10"
          style={{ maxHeight: "min(32rem, calc(100vh - 6rem))" }}
        >
          <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Notifications</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={unreadCount === 0 || markAllMutation.isPending}
                className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:pointer-events-none disabled:text-slate-300"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={() => clearAllMutation.mutate()}
                disabled={notifications.length === 0 || clearAllMutation.isPending}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:pointer-events-none disabled:text-slate-300"
              >
                <Trash2 className="size-3.5" />
                Clear
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <NotificationLoading />
            ) : notifications.length === 0 ? (
              <NotificationEmptyState />
            ) : (
              <div className="divide-y divide-slate-100">
                {previewNotifications.map((notification) => (
                  <NotificationItem
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
          </div>
          {notifications.length > previewNotifications.length && (
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="shrink-0 flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              <span>View all notifications ({notifications.length})</span>
              <span aria-hidden="true">-&gt;</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, onClick, onClear, clearing }) {
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
        className="grid w-full min-w-0 grid-cols-[0.75rem_1fr] gap-3 px-4 py-3 text-left"
      >
        <span className={`mt-1.5 size-2.5 rounded-full ${notification.isRead ? "bg-slate-300" : dotClass}`} />
        <span className="min-w-0">
          <span
            className={[
              "block truncate text-sm text-slate-950",
              notification.isRead ? "font-medium" : "font-semibold",
            ].join(" ")}
          >
            {notification.title || "Notification"}
          </span>
          <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-600">
            {notification.message || "-"}
          </span>
          <span className="mt-1.5 block text-xs font-medium text-slate-400">
            {formatNotificationRelativeTime(notification.createdAt)}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={clearing}
        className="mr-2 mt-2.5 inline-flex size-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Clear notification"
        title="Clear notification"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function NotificationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Bell className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-950">No notifications yet</p>
    </div>
  );
}

function NotificationLoading() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="grid animate-pulse grid-cols-[0.75rem_1fr] gap-3">
          <div className="mt-1.5 size-2.5 rounded-full bg-slate-200" />
          <div>
            <div className="h-3 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-full rounded bg-slate-100" />
            <div className="mt-2 h-3 w-16 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
