import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./session";
import { logout as clearAuthService } from "./authService";
import {
  getPermissionsFromToken,
  getPrimaryRoleFromToken,
  getRolesFromToken,
  getUserIdFromToken,
  getUserNameFromToken,
  isTokenExpired,
} from "./permissions";

const AuthContext = createContext();

function readSession() {
  const t = getAccessToken();
  if (!t || isTokenExpired(t)) {
    return {
      isAuthenticated: false,
      accessToken: null,
      userId: null,
      userRole: null,
      roles: [],
      userName: null,
      permissions: [],
    };
  }
  return {
    isAuthenticated: true,
    accessToken: t,
    userId: getUserIdFromToken(t),
    userRole: getPrimaryRoleFromToken(t),
    roles: getRolesFromToken(t),
    userName: getUserNameFromToken(t),
    permissions: getPermissionsFromToken(t),
  };
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const s0 = readSession();
  const [isAuthenticated, setIsAuthenticated] = useState(s0.isAuthenticated);
  const [accessToken, setAccessToken] = useState(s0.accessToken);
  const [userId, setUserId] = useState(s0.userId);
  const [userRole, setUserRole] = useState(s0.userRole);
  const [roles, setRoles] = useState(s0.roles);
  const [userName, setUserName] = useState(s0.userName);
  const [permissions, setPermissions] = useState(s0.permissions);

  const hydrateFromToken = useCallback((token) => {
    setAccessToken(token);
    setUserId(getUserIdFromToken(token));
    setUserRole(getPrimaryRoleFromToken(token));
    setRoles(getRolesFromToken(token));
    setUserName(getUserNameFromToken(token));
    setPermissions(getPermissionsFromToken(token));
  }, []);

  const isSuperAdmin = roles.some(
    (role) => role.toLowerCase() === "superadmin"
  );

  const hasPermission = useCallback(
    (p) => isSuperAdmin || permissions.includes(p),
    [isSuperAdmin, permissions]
  );

  const hasAnyPermission = useCallback(
    (list) => isSuperAdmin || list.some((p) => permissions.includes(p)),
    [isSuperAdmin, permissions]
  );

  const hasRole = useCallback(
    (roleName) =>
      roles.some((role) => role.toLowerCase() === roleName.toLowerCase()),
    [roles]
  );

  const loginSuccess = useCallback(
    (token) => {
      queryClient.removeQueries({ queryKey: ["notifications"] });
      queryClient.removeQueries({ queryKey: ["notifications-unread-count"] });
      hydrateFromToken(token);
      setIsAuthenticated(true);
    },
    [hydrateFromToken, queryClient]
  );

  const logout = useCallback(() => {
    queryClient.removeQueries({ queryKey: ["notifications"] });
    queryClient.removeQueries({ queryKey: ["notifications-unread-count"] });
    clearAuthService();
    setIsAuthenticated(false);
    setAccessToken(null);
    setUserId(null);
    setUserRole(null);
    setRoles([]);
    setUserName(null);
    setPermissions([]);
  }, [queryClient]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      accessToken,
      userId,
      userRole,
      roles,
      userName,
      permissions,
      isSuperAdmin,
      hasRole,
      hasPermission,
      hasAnyPermission,
      loginSuccess,
      logout,
    }),
    [
      isAuthenticated,
      accessToken,
      userId,
      userRole,
      roles,
      userName,
      permissions,
      isSuperAdmin,
      hasRole,
      hasPermission,
      hasAnyPermission,
      loginSuccess,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
