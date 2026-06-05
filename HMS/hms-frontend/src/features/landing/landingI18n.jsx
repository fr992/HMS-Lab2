import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  LandingLanguageContext,
  normalizeLanguage,
  readSavedLanguage,
  resolvePath,
  STORAGE_KEY,
  translations,
} from "@/features/landing/landingLanguage";

export function LandingLanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readSavedLanguage);

  const setLanguage = (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    window.localStorage.setItem(STORAGE_KEY, normalized);
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => {
    const dictionary = translations[language] ?? translations[DEFAULT_LANGUAGE];

    return {
      language,
      setLanguage,
      t(path) {
        return resolvePath(dictionary, path) ?? resolvePath(translations.en, path) ?? path;
      },
    };
  }, [language]);

  return (
    <LandingLanguageContext.Provider value={value}>
      {children}
    </LandingLanguageContext.Provider>
  );
}
