import MainSection from "@/patients/components/landing/MainSection";
import DirectorsSection from "@/patients/components/landing/DirectorsSection";
import ClinicsSection from "@/patients/components/landing/ClinicsSection";
import EquipmentSection from "@/patients/components/landing/EquipmentSection";
import AppointmentForm from "@/patients/components/landing/AppointmentForm";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <MainSection />
        <DirectorsSection />
        <ClinicsSection />
        <EquipmentSection />
        <AppointmentForm />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-sm font-bold tracking-tight text-slate-900">
          HMS <span className="text-sky-500">·</span> City Hospital
        </span>
        <div className="flex items-center gap-6">
          <a href="#clinics" className="hidden text-xs font-medium text-slate-500 transition hover:text-slate-900 sm:block">
            Clinics
          </a>
          <a href="#appointment" className="hidden text-xs font-medium text-slate-500 transition hover:text-slate-900 sm:block">
            Book Appointment
          </a>
          <Link
            to="/login"
            className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Staff Login
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} City Hospital · All rights reserved ·{" "}
        <a href="#appointment" className="text-sky-500 hover:underline">
          Book an Appointment
        </a>
      </div>
    </footer>
  );
}