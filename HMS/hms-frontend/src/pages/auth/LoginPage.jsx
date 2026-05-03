import { useState } from "react";
import { login } from "@/auth/authService";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getPrimaryRoleFromToken,
  getPermissionsFromToken,
} from "@/auth/permissions";

function defaultPathForSession(token) {
  const role = getPrimaryRoleFromToken(token);
  const perms = getPermissionsFromToken(token);

  if (role === "Admin") return "/admin/dashboard";
  if (role === "Doctor") return "/doctor/encounters";
  if (role === "Patient") return "/patient/encounters";

  if (perms.includes("Patients.Read")) return "/patients";

  return "/unauthorized";
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const auth = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e?.preventDefault?.();
    setError(null);
    setSubmitting(true);
    try {
      const data = await login(username, password);
      auth.loginSuccess(data.accessToken);
      navigate(defaultPathForSession(data.accessToken), { replace: true });
    } catch (err) {
      const status = err.response?.status;
      setError(
        status
          ? `Sign-in failed (HTTP ${status}). Check your credentials.`
          : "Sign-in failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-lg font-semibold text-slate-900">
          Hospital Management System
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">Staff sign in</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {error && (
            <p
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
              role="alert"
            >
              {error}
            </p>
          )}
          <div>
            <label
              className="mb-1 block text-xs font-medium text-slate-600"
              htmlFor="username"
            >
              Username or email
            </label>
            <input
              id="username"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-slate-600"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
