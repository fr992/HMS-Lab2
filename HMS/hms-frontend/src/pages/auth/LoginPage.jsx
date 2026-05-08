import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { login } from "@/auth/authService";
import { useAuth } from "@/auth/AuthContext";
import {
  getPrimaryRoleFromToken,
  getPermissionsFromToken,
} from "@/auth/permissions";

function defaultPathForSession(token) {
  const role = getPrimaryRoleFromToken(token);
  const perms = getPermissionsFromToken(token);

  if (role === "Admin") return "/admin/dashboard";
  if (role === "Doctor") return "/doctor/dashboard";
  if (role === "Patient") return "/patient/encounters";

  if (perms.includes("Patients.Read")) return "/patients";
  if (perms.includes("LabRequests.Read")) return "/lab-requests";

  return "/unauthorized";
}

const INPUT_CLASS =
  "h-12 w-full rounded-md border border-cyan-100 bg-white px-4 text-sm text-cyan-950 shadow-sm outline-none transition placeholder:text-cyan-800/35 focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-[#f7fbfd] text-cyan-950">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-6 lg:grid-cols-[1fr_28rem] lg:px-8">
        <section className="flex flex-col justify-between">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>

          <div className="landing-reveal max-w-2xl py-16 lg:py-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <HeartPulse className="size-4" />
              HMS City Hospital
            </div>
            <h1 className="mt-8 max-w-2xl text-5xl font-semibold leading-[1.05] text-cyan-950 sm:text-6xl">
              Hospital portal,{" "}
              <span className="text-blue-600">ready when you are.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-cyan-800/75 sm:text-lg">
              Continue to your secure HMS workspace with the same clean,
              coordinated experience used across City Hospital.
            </p>
          </div>

          <p className="hidden text-sm font-medium text-cyan-800/55 lg:block">
            HMS City Hospital | Portal Access
          </p>
        </section>

        <section className="flex items-center">
          <div className="landing-reveal landing-delay-2 w-full rounded-md border border-cyan-100 bg-white p-6 shadow-2xl shadow-cyan-950/10 sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex size-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <ShieldCheck className="size-5" />
                </span>
                <h2 className="mt-6 text-2xl font-semibold text-cyan-950">
                  Sign In
                </h2>
                <p className="mt-2 text-sm leading-6 text-cyan-800/65">
                  Use your portal credentials.
                </p>
              </div>
              <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                HMS
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
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
                  className="mb-2 block text-sm font-semibold text-cyan-900"
                  htmlFor="username"
                >
                  Username or email
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-600/60" />
                  <input
                    id="username"
                    className={`${INPUT_CLASS} pl-10`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="admin or name@hospital.com"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-cyan-900"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-600/60" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`${INPUT_CLASS} pl-10 pr-11`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-cyan-700 transition hover:bg-blue-50 hover:text-blue-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign In"}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
