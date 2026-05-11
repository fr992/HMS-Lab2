import { Link, Outlet } from "react-router-dom";
import { BriefcaseMedical, Clock3, LogIn, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOSPITAL_FULL_NAME, HOSPITAL_LOGO_PATH, HOSPITAL_NAME } from "@/config/branding";

const NAV_LINKS = [
  { href: "#leadership", label: "Services" },
  { href: "#clinics", label: "Departments" },
  { href: "#equipment", label: "Technology" },
  { href: "#appointment", label: "Book a Visit" },
];

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-white text-cyan-950">
      <header className="sticky top-0 z-50 border-b border-cyan-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-4 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm shadow-blue-700/20 ring-1 ring-cyan-100">
              <img src={HOSPITAL_LOGO_PATH} alt="" className="size-8 object-contain" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-cyan-950">{HOSPITAL_NAME}</span>
              <span className="mt-1 text-xs font-medium text-cyan-700">Hospital</span>
            </span>
          </a>

          <nav
            aria-label="Landing page sections"
            className="scrollbar-none order-last flex w-full items-center gap-1 overflow-x-auto pt-2 sm:order-none sm:ml-6 sm:w-auto sm:flex-1 sm:justify-center sm:pt-0"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50 hover:text-cyan-950"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="lg" className="h-10 rounded-full bg-blue-600 px-5 text-white shadow-sm shadow-blue-700/20 hover:bg-blue-500">
              <Link to="/login">
                <LogIn className="size-4" />
                Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-cyan-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 text-sm text-cyan-800 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <BriefcaseMedical className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-cyan-950">{HOSPITAL_FULL_NAME}</p>
              <p className="mt-0.5 text-xs text-cyan-700/70">Copyright 2026. All rights reserved.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-cyan-700/80">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-blue-600" />
              {HOSPITAL_NAME} Campus
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-blue-600" />
              24/7 Emergency Care
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 text-blue-600" />
              +383 44 123 456
            </span>
          </div>

          <div className="flex flex-wrap gap-1 text-sm font-medium text-cyan-700">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 transition hover:bg-blue-50 hover:text-blue-700"
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
