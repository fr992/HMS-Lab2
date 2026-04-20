import { Outlet, Link } from 'react-router-dom';
import { useAuth } from "@/auth/AuthContext";
import Sidebar from './Sidebar';

export default function AdminLayout() {
    const auth = useAuth();
    return (
        <div style={{display: "flex" }}>
            

       <Sidebar />

            { /* Content */ }
            <main style={{ padding: 20 }}>
                <Outlet />
            </main>

        </div>
    );
}