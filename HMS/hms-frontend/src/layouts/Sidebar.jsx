import { useAuth } from "@/auth/AuthContext";
import { Link } from "react-router-dom";

export default function Sidebar() {
    const auth = useAuth();

    return (
        <div>
            <h3>Menu</h3>

            {/* ADMIN */}
            {auth.userRole === "Admin" && (
                <>
                    <Link to="/admin/dashboard">Dashboard</Link><br />
                    <Link to="/admin/users">Users</Link><br />
                </>
            )}

            {/* USER */}
            {auth.userRole === "User" && (
                <>
                    <Link to="/user/dashboard">Dashboard</Link><br />
                </>
            )}

            {/* DOCTOR */}
            {auth.userRole === "Doctor" && (
                <>
                    <Link to="/doctor/patients">Patients</Link><br />
                </>
            )}
        </div>
    );
}