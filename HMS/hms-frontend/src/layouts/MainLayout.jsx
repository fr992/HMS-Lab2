import { Link, Outlet } from "react-router-dom";
import { BriefcaseMedical, Clock3, LogIn, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPublicSetting,
  getLocalizedPublicSetting,
  getShortHospitalName,
  usePublicSettings,
} from "@/features/landing/publicSettings";
import { LandingLanguageProvider } from "@/features/landing/landingI18n";
import { useLandingLanguage } from "@/features/landing/landingLanguage";

export default function MainLayout() {
  return (
    <LandingLanguageProvider>
      <PublicLandingLayout />
    </LandingLanguageProvider>
  );
}

function PublicLandingLayout() {
  const { language, setLanguage, t } = useLandingLanguage();
  const { settings } = usePublicSettings();
  const navLinks = [
    { href: "#leadership", label: t("nav.services") },
    { href: "#clinics", label: t("nav.departments") },
    { href: "#equipment", label: t("nav.technology") },
    { href: "#appointment", label: t("nav.appointment") },
  ];
  const hospitalName = getPublicSetting(settings, "hospital.name");
  const shortHospitalName = getShortHospitalName(settings);
  const logoUrl = getPublicSetting(settings, "hospital.logoUrl");
  const address = getPublicSetting(settings, "hospital.address");
  const email = getPublicSetting(settings, "hospital.email");
  const phone = getPublicSetting(settings, "hospital.phone");
  const workingHours = getPublicSetting(settings, "hospital.workingHours");
  const footerText = getLocalizedPublicSetting(settings, "landing.footerText", language);

  return (
    <div className="min-h-screen bg-white text-cyan-950">
      <header className="sticky top-0 z-45 border-b border-cyan-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm shadow-blue-700/20 ring-1 ring-cyan-100">
              <img src={logoUrl} alt="" className="size-8 object-contain" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-cyan-950">{shortHospitalName}</span>
              <span className="mt-1 text-xs font-medium text-cyan-700">{t("brandType")}</span>
            </span>
          </a>

          <nav
            aria-label="Landing page sections"
            className="scrollbar-none order-last flex w-full items-center gap-1 overflow-x-auto pt-2 sm:order-0 sm:ml-6 sm:w-auto sm:flex-1 sm:justify-center sm:pt-0"
          >
            {navLinks.map((link) => (
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
            <LanguageSwitcher language={language} onChange={setLanguage} />
            <Button asChild size="lg" className="h-10 rounded-full bg-blue-600 px-4 text-white shadow-sm shadow-blue-700/20 hover:bg-blue-500 sm:px-5">
              <Link to="/login">
                <LogIn className="size-4" />
                {t("login")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-cyan-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-cyan-800 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <BriefcaseMedical className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-cyan-950">{hospitalName}</p>
              <p className="mt-0.5 text-xs text-cyan-700/70">{footerText}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-cyan-700/80">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-blue-600" />
              {address}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-blue-600" />
              {workingHours}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 text-blue-600" />
              {phone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5 text-blue-600" />
              {email}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 text-sm font-medium text-cyan-700">
            {navLinks.map((link) => (
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

function LanguageSwitcher({ language, onChange }) {
  return (
    <div className="inline-flex h-9 shrink-0 items-center rounded-full border border-cyan-100 bg-cyan-50/70 p-0.5 text-xs font-semibold text-cyan-700">
      {[
        { code: "sq", label: "SQ" },
        { code: "en", label: "EN" },
      ].map((item) => {
        const active = language === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => onChange(item.code)}
            className={[
              "h-7 rounded-full px-2.5 transition",
              active
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-cyan-100"
                : "text-cyan-700 hover:bg-white/70 hover:text-cyan-950",
            ].join(" ")}
            aria-pressed={active}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
