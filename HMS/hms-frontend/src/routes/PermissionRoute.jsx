import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { getAccessToken } from "@/auth/session";

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children
 * @param {string[]=} props.anyPermission — user needs at least one
 * @param {string[]=} props.allPermissions — user needs every listed permission
 * @param {string=} props.requireRole
 * @param {string[]=} props.anyRole
 * @param {string[]=} props.blockedRoles
 */
export default function PermissionRoute({
  children,
  anyPermission,
  allPermissions,
  requireRole,
  anyRole,
  blockedRoles,
}) {
  const auth = useAuth();
  const token = getAccessToken();

  if (!token || !auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const superAdminCanEnter =
    auth.isSuperAdmin && ["Admin", "SuperAdmin"].includes(requireRole);

  if (requireRole && !auth.hasRole(requireRole) && !superAdminCanEnter) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (anyRole && anyRole.length > 0) {
    const ok = anyRole.some((role) => auth.hasRole(role));
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }

  if (blockedRoles && blockedRoles.some((role) => auth.hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (anyPermission && anyPermission.length > 0) {
    if (!auth.hasAnyPermission(anyPermission)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (allPermissions && allPermissions.length > 0) {
    const ok = allPermissions.every((p) => auth.hasPermission(p));
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
