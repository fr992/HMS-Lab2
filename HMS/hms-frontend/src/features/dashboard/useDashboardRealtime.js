import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "@/auth/AuthContext";
import { API_BASE_URL } from "@/config/environment";
import { isTokenExpired } from "@/auth/permissions";

function getDashboardHubUrl() {
  return `${API_BASE_URL.replace(/\/api\/?$/, "")}/hubs/dashboard`;
}

export function useDashboardRealtime(onDashboardChanged, { debounceMs = 500 } = {}) {
  const auth = useAuth();
  const callbackRef = useRef(onDashboardChanged);
  const timeoutRef = useRef(null);
  const canConnect =
    Boolean(auth.isAuthenticated && auth.accessToken) &&
    !isTokenExpired(auth.accessToken);

  useEffect(() => {
    callbackRef.current = onDashboardChanged;
  }, [onDashboardChanged]);

  useEffect(() => {
    if (!canConnect) return undefined;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getDashboardHubUrl(), {
        accessTokenFactory: () => auth.accessToken,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("dashboardChanged", (message) => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        callbackRef.current?.(message);
      }, debounceMs);
    });

    let disposed = false;
    const startPromise = connection.start().catch(() => {});

    return () => {
      disposed = true;
      window.clearTimeout(timeoutRef.current);
      connection.off("dashboardChanged");
      void startPromise.finally(() => {
        if (disposed && connection.state !== signalR.HubConnectionState.Disconnected) {
          void connection.stop();
        }
      });
    };
  }, [auth.accessToken, canConnect, debounceMs]);
}
