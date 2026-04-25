import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { getAccessToken } from "./session";
import { logout as clearAuthService } from "./authService";
import {
  getPermissionsFromToken,
  getPrimaryRoleFromToken,
  getUserNameFromToken,
} from "./permissions";

const AuthContext = createContext();

function readSession() {
  const t = getAccessToken();
  if (!t) {
    return {
      isAuthenticated: false,
      userRole: null,
      userName: null,
      permissions: [],
    };
  }
  return {
    isAuthenticated: true,
    userRole: getPrimaryRoleFromToken(t),
    userName: getUserNameFromToken(t),
    permissions: getPermissionsFromToken(t),
  };
}

export function AuthProvider({ children }) {
  const s0 = readSession();
  const [isAuthenticated, setIsAuthenticated] = useState(s0.isAuthenticated);
  const [userRole, setUserRole] = useState(s0.userRole);
  const [userName, setUserName] = useState(s0.userName);
  const [permissions, setPermissions] = useState(s0.permissions);

  const hydrateFromToken = useCallback((token) => {
    setUserRole(getPrimaryRoleFromToken(token));
    setUserName(getUserNameFromToken(token));
    setPermissions(getPermissionsFromToken(token));
  }, []);

  const hasPermission = useCallback(
    (p) => permissions.includes(p),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (list) => list.some((p) => permissions.includes(p)),
    [permissions]
  );

  const loginSuccess = useCallback(
    (token) => {
      hydrateFromToken(token);
      setIsAuthenticated(true);
    },
    [hydrateFromToken]
  );

  const logout = useCallback(() => {
    clearAuthService();
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName(null);
    setPermissions([]);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      userRole,
      userName,
      permissions,
      hasPermission,
      hasAnyPermission,
      loginSuccess,
      logout,
    }),
    [
      isAuthenticated,
      userRole,
      userName,
      permissions,
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
