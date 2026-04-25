import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children
 * @param {string[]=} props.anyPermission — user needs at least one
 * @param {string[]=} props.allPermissions — user needs every listed permission
 * @param {string=} props.requireRole
 */
export default function PermissionRoute({
  children,
  anyPermission,
  allPermissions,
  requireRole,
}) {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && auth.userRole !== requireRole) {
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
