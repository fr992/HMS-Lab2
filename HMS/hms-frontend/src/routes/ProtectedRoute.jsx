
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
    const auth = useAuth();

    // 🔐 Login guard
    if (!auth.isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 🛡 Role guard (multi-role support)
    if (allowedRoles && !allowedRoles.includes(auth.userRole)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}