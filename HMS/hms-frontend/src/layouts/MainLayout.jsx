import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-bold tracking-tight">
            HMS <span className="text-sky-500">·</span> City Hospital
          </span>
          <div className="flex items-center gap-4">
            <a
              href="#appointment"
              className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
            >
              Appointment
            </a>
            <Button asChild size="sm">
              <Link to="/login">Staff Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-slate-500">
          <p>© City Hospital. All rights reserved.</p>
          <a href="#appointment" className="text-sky-600 hover:underline">
            Request Appointment
          </a>
        </div>
      </footer>
    </div>
  );
}
