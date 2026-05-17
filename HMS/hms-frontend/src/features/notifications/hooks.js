import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { isTokenExpired } from "@/auth/permissions";
import {
  getMyNotifications,
  getUnreadCount,
} from "@/features/notifications/api/notificationsApi";

export const notificationQueryKeys = {
  all: ["notifications"],
  unreadAll: ["notifications-unread-count"],
  list: (userKey) => [...notificationQueryKeys.all, userKey],
  unreadCount: (userKey) => [...notificationQueryKeys.unreadAll, userKey],
};

export function useNotifications() {
  const auth = useAuth();
  const userKey = auth.userId ?? auth.userName ?? null;
  const enabled =
    Boolean(auth.isAuthenticated && auth.accessToken && userKey) &&
    !isTokenExpired(auth.accessToken);

  return useQuery({
    queryKey: notificationQueryKeys.list(userKey ?? "anonymous"),
    queryFn: () => getMyNotifications(),
    enabled,
    refetchInterval: 90_000,
  });
}

export function useUnreadNotificationCount() {
  const auth = useAuth();
  const userKey = auth.userId ?? auth.userName ?? null;
  const enabled =
    Boolean(auth.isAuthenticated && auth.accessToken && userKey) &&
    !isTokenExpired(auth.accessToken);

  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(userKey ?? "anonymous"),
    queryFn: getUnreadCount,
    enabled,
    refetchInterval: 90_000,
  });
}
