import { useQuery } from "@tanstack/react-query";
import { fetchPublicSettings } from "@/features/landing/api/publicSettingsApi";
import { HOSPITAL_FULL_NAME, HOSPITAL_LOGO_PATH, HOSPITAL_NAME } from "@/config/branding";

export const PUBLIC_SETTING_FALLBACKS = {
  "hospital.name": HOSPITAL_FULL_NAME,
  "hospital.logoUrl": HOSPITAL_LOGO_PATH,
  "hospital.email": "contact@nexora.local",
  "hospital.phone": "+1 (555) 123-4567",
  "hospital.address": "123 Medical Avenue, Healthcare City",
  "hospital.emergencyPhone": "+1 (555) 911-0000",
  "hospital.workingHours": "Open 24/7 for emergency care. Clinics: Mon-Fri, 8:00 AM - 6:00 PM.",
  "landing.heroTitle": "Premium care, close to home.",
  "landing.heroTitle.sq": "Kujdes premium, pranë shtëpisë.",
  "landing.heroTitle.en": "Premium care, close to home.",
  "landing.heroSubtitle": `${HOSPITAL_FULL_NAME} brings together specialist care, connected diagnostics, and coordinated teams so every patient journey feels clear from the first visit.`,
  "landing.heroSubtitle.sq": `${HOSPITAL_FULL_NAME} bashkon kujdesin specialistik, diagnostikimin e lidhur dhe ekipet e koordinuara që çdo udhëtim i pacientit të jetë i qartë që nga vizita e parë.`,
  "landing.heroSubtitle.en": `${HOSPITAL_FULL_NAME} brings together specialist care, connected diagnostics, and coordinated teams so every patient journey feels clear from the first visit.`,
  "landing.aboutText": "Senior clinicians, nursing leads, and front-desk operations work from the same care record so every handoff has context.",
  "landing.aboutText.sq": "Klinicistët senior, udhëheqësit e infermierisë dhe recepsioni punojnë nga i njëjti rekord kujdesi që çdo dorëzim të ketë kontekst.",
  "landing.aboutText.en": "Senior clinicians, nursing leads, and front-desk operations work from the same care record so every handoff has context.",
  "landing.emergencyContactText": "24/7 Emergency Care",
  "landing.emergencyContactText.sq": "Urgjenca 24/7",
  "landing.emergencyContactText.en": "24/7 Emergency Care",
  "landing.footerText": "Copyright 2026. All rights reserved.",
  "landing.footerText.sq": "Copyright 2026. Të gjitha të drejtat e rezervuara.",
  "landing.footerText.en": "Copyright 2026. All rights reserved.",
};

export function getPublicSetting(settings, key) {
  const value = settings?.[key];
  return typeof value === "string" && value.trim()
    ? value.trim()
    : PUBLIC_SETTING_FALLBACKS[key] ?? "";
}

export function getLocalizedPublicSetting(settings, key, language) {
  const localizedKey = `${key}.${language}`;
  return getPublicSetting(settings, localizedKey) || getPublicSetting(settings, key);
}

export function getShortHospitalName(settings) {
  const name = getPublicSetting(settings, "hospital.name");
  return name.endsWith(" Hospital") ? name.slice(0, -" Hospital".length) : name || HOSPITAL_NAME;
}

export function usePublicSettings() {
  const query = useQuery({
    queryKey: ["public-settings"],
    queryFn: fetchPublicSettings,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 1000,
    refetchIntervalInBackground: true,
  });

  return {
    ...query,
    settings: query.data ?? {},
  };
}
