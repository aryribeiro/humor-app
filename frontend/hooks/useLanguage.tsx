"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { Locale } from "@/lib/i18n";
import { VoiceId, getVoiceForLocale } from "@/lib/voiceConfig";

interface LanguageContextValue {
  locale: Locale;
  voiceId: VoiceId;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);


export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-BR");

  useEffect(() => {
    setLocaleState("pt-BR");
    document.documentElement.lang = "pt-BR";
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const voiceId = getVoiceForLocale(locale);

  return (
    <LanguageContext.Provider value={{ locale, voiceId, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
