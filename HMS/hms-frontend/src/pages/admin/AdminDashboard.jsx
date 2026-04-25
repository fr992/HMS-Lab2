import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function AdminDashboard() {
  const auth = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Welcome{auth.userName ? `, ${auth.userName}` : ""}. Use the menu to
        manage users, roles, and system areas you can access.
      </p>
      {auth.hasPermission("Patients.Read") && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-800">Quick link</h2>
          <p className="mt-1 text-sm text-slate-600">
            Open the patient registry to view or update records.
          </p>
          <Link
            to="/patients"
            className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline"
          >
            Go to patients →
          </Link>
        </div>
      )}
    </div>
  );
}
