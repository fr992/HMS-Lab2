import { Outlet, Link } from 'react-router-dom';

export default function AdminLayout() {
    return (
        <div style={{display: "flex" }}>
            
            {/* sidebar*/}
            <aside style={{ width: 250, background: "#222", color: "white"}}>
                <h2>Admin</h2>
                <ul>
                    <li>
                        <Link to="/admin/dashboard">Dashboard</Link></li>
                    <li>
                        <Link to="/admin/users">Users</Link></li>
                </ul>
            </aside>

            { /* Content */ }
            <main style={{ padding: 20 }}>
                <Outlet />
            </main>

        </div>
    );
}