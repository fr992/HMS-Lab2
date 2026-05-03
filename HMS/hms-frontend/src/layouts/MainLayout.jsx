import { Link, Outlet } from "react-router-dom";
import { BriefcaseMedical, CalendarCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#leadership", label: "Leadership" },
  { href: "#clinics", label: "Clinics" },
  { href: "#equipment", label: "Equipment" },
  { href: "#appointment", label: "Appointment" },
];

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-3 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm">
              <BriefcaseMedical className="size-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-slate-950">HMS</span>
              <span className="mt-1 text-xs font-medium text-slate-500">City Hospital</span>
            </span>
          </a>

          <nav
            aria-label="Landing page sections"
            className="order-last flex w-full items-center gap-1 overflow-x-auto pt-2 sm:order-none sm:ml-6 sm:w-auto sm:flex-1 sm:justify-center sm:pt-0"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="#appointment"
              className="hidden h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 md:inline-flex"
            >
              <CalendarCheck className="size-4" />
              Request
            </a>
            <Button asChild size="lg" className="h-9 rounded-md bg-slate-950 px-3 text-white hover:bg-slate-800">
              <Link to="/login">
                <LogIn className="size-4" />
                Staff Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 text-sm lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-semibold">HMS City Hospital</p>
            <p className="mt-1 text-slate-400">Copyright 2026. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-slate-300">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
