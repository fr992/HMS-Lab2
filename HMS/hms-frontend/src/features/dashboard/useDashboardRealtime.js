import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "@/auth/AuthContext";
import { isTokenExpired } from "@/auth/permissions";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7297/api";

function getDashboardHubUrl() {
  return `${apiBaseUrl.replace(/\/api\/?$/, "")}/hubs/dashboard`;
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

    connection.start().catch(() => {});

    return () => {
      window.clearTimeout(timeoutRef.current);
      connection.off("dashboardChanged");
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
  }, [auth.accessToken, canConnect, debounceMs]);
}
