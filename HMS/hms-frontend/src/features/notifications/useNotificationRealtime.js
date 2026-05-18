import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { isTokenExpired } from "@/auth/permissions";
import { notificationQueryKeys } from "@/features/notifications/hooks";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7297/api";

function getNotificationsHubUrl() {
  return `${apiBaseUrl.replace(/\/api\/?$/, "")}/hubs/notifications`;
}

export function useNotificationRealtime() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userKey = auth.userId ?? auth.userName ?? null;
  const canConnect =
    Boolean(auth.isAuthenticated && auth.accessToken && userKey) &&
    !isTokenExpired(auth.accessToken);

  useEffect(() => {
    if (!canConnect) return undefined;

    const listQueryKey = notificationQueryKeys.list(userKey);
    const unreadQueryKey = notificationQueryKeys.unreadCount(userKey);
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getNotificationsHubUrl(), {
        accessTokenFactory: () => auth.accessToken,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("notificationReceived", (notification) => {
      if (!notification?.id) return;
      if (auth.userId && String(notification.userId) !== String(auth.userId)) {
        return;
      }

      const existingNotifications = queryClient.getQueryData(listQueryKey) ?? [];
      const alreadyExists = existingNotifications.some(
        (item) => item.id === notification.id
      );

      queryClient.setQueryData(listQueryKey, (current = []) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }

        return [notification, ...current].slice(0, 50);
      });

      if (!alreadyExists && !notification.isRead) {
        queryClient.setQueryData(unreadQueryKey, (current = 0) =>
          Number(current) + 1
        );
      }

      if (!alreadyExists) {
        toast(notification.title || "Notification", {
          description: notification.message,
          className: "notification-toast",
          classNames: {
            title: "text-slate-950",
            description: "text-slate-700",
          },
        });
      }
    });

    connection.start().catch(() => {});

    return () => {
      connection.off("notificationReceived");
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
  }, [
    auth.accessToken,
    auth.userId,
    canConnect,
    queryClient,
    userKey,
  ]);
}
