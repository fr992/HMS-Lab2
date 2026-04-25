import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children
 * @param {string[]=} props.allowedRoles
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
