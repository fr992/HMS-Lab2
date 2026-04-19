import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function ProtectedRoute({ children, role }) {
    const auth = useAuth();

    if(!auth.isAuthenticated)
        return <Navigate to="/login" />;

    if(role && auth.userRole !== role)
        return <Navigate to="/" />;
    
    return children;
}