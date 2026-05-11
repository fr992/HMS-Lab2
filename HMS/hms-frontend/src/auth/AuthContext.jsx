import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { getAccessToken } from "./session";
import { logout as clearAuthService } from "./authService";
import {
  getPermissionsFromToken,
  getPrimaryRoleFromToken,
  getRolesFromToken,
  getUserNameFromToken,
} from "./permissions";

const AuthContext = createContext();

function readSession() {
  const t = getAccessToken();
  if (!t) {
    return {
      isAuthenticated: false,
      userRole: null,
      roles: [],
      userName: null,
      permissions: [],
    };
  }
  return {
    isAuthenticated: true,
    userRole: getPrimaryRoleFromToken(t),
    roles: getRolesFromToken(t),
    userName: getUserNameFromToken(t),
    permissions: getPermissionsFromToken(t),
  };
}

export function AuthProvider({ children }) {
  const s0 = readSession();
  const [isAuthenticated, setIsAuthenticated] = useState(s0.isAuthenticated);
  const [userRole, setUserRole] = useState(s0.userRole);
  const [roles, setRoles] = useState(s0.roles);
  const [userName, setUserName] = useState(s0.userName);
  const [permissions, setPermissions] = useState(s0.permissions);

  const hydrateFromToken = useCallback((token) => {
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
      hydrateFromToken(token);
      setIsAuthenticated(true);
    },
    [hydrateFromToken]
  );

  const logout = useCallback(() => {
    clearAuthService();
    setIsAuthenticated(false);
    setUserRole(null);
    setRoles([]);
    setUserName(null);
    setPermissions([]);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
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
