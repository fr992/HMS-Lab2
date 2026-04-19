import { Outlet, Link } from 'react-router-dom';
import { useAuth } from "@/auth/AuthContext";

export default function AdminLayout() {
    const auth = useAuth();
    return (
        <div style={{display: "flex" }}>
            
            {/* sidebar*/}
            <aside style={{ width: 250, background: "#222", color: "white"}}>
                <h2>Admin</h2>
                {/* <ul>
                    <li>
                        <Link to="/admin/dashboard">Dashboard</Link></li>
                    <li>
                        <Link to="/admin/users">Users</Link></li>
                </ul>*/}
                <ul>

                    {/* ADMIN ONLY */}
                    {auth.userRole === "Admin" && (
                        <>
                            <li>
                                <Link to="/admin/dashboard">Dashboard</Link>
                            </li>
                            <li>
                                <Link to="/admin/users">Users</Link>
                            </li>
                        </>
                    )}

                    {/* USER */}
                    {auth.userRole === "User" && (
                        <>
                            <li>
                                <Link to="/user/dashboard">My Dashboard</Link>
                            </li>
                        </>
                    )}

                    {/* DOCTOR */}
                    {auth.userRole === "Doctor" && (
                        <>
                            <li>
                                <Link to="/doctor/patients">Patients</Link>
                            </li>
                        </>
                    )}

                </ul>

            </aside>

            { /* Content */ }
            <main style={{ padding: 20 }}>
                <Outlet />
            </main>

        </div>
    );
}