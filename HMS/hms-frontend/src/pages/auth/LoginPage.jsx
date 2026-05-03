import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { login } from "@/auth/authService";
import { useAuth } from "@/auth/AuthContext";
import {
  getPrimaryRoleFromToken,
  getPermissionsFromToken,
} from "@/auth/permissions";
import { HERO_IMAGE_URL } from "@/features/landing/landingData";

function defaultPathForSession(token) {
  const role = getPrimaryRoleFromToken(token);
  const perms = getPermissionsFromToken(token);

  if (role === "Admin") return "/admin/dashboard";
  if (role === "Doctor") return "/doctor/encounters";
  if (role === "Patient") return "/patient/encounters";

  if (perms.includes("Patients.Read")) return "/patients";

  return "/unauthorized";
}

const INPUT_CLASS =
  "h-12 w-full rounded-md border border-slate-200 bg-white/95 px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

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
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <img
        src={HERO_IMAGE_URL}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(105deg, rgba(2, 6, 23, 0.97) 0%, rgba(15, 23, 42, 0.91) 48%, rgba(15, 23, 42, 0.54) 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/90 to-transparent" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-6 lg:grid-cols-[1fr_30rem] lg:px-8">
        <section className="flex flex-col justify-between">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/15"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>

          <div className="landing-reveal max-w-2xl py-14 lg:py-0">
            <div className="inline-flex items-center gap-2 rounded-md border border-sky-200/20 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold text-sky-100 backdrop-blur">
              <HeartPulse className="size-3.5" />
              HMS City Hospital
            </div>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-tight sm:text-6xl">
              Hospital Management System
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">
              Sign in to continue to the City Hospital portal.
            </p>
          </div>

          <p className="hidden text-sm text-slate-400 lg:block">
            HMS City Hospital | Portal Access
          </p>
        </section>

        <section className="flex items-center">
          <div className="landing-reveal landing-delay-2 w-full overflow-hidden rounded-md border border-white/15 bg-white text-slate-950 shadow-2xl shadow-slate-950/40">
            <div className="border-b border-slate-100 bg-slate-950 px-5 py-6 text-white sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex size-12 items-center justify-center rounded-md bg-white text-slate-950 shadow-lg shadow-slate-950/20">
                  <HeartPulse className="size-5" />
                </div>
                <span className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                  HMS
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-white">
                Sign In
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use your portal credentials.
              </p>
            </div>

            <div className="p-5 sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">Welcome</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Enter your username or email and password.
                </p>
              </div>
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
                  className="mb-2 block text-sm font-semibold text-slate-700"
                  htmlFor="username"
                >
                  Username or email
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
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
                  className="mb-2 block text-sm font-semibold text-slate-700"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
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
                    className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign In"}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
