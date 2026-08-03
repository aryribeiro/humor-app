"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { i18n, Locale } from "@/lib/i18n";
import { Flag } from "./Flag";

const LOCALES: Locale[] = ["pt-BR", "en-US", "es-US"];

const RING_COLORS: Record<Locale, string> = {
  "pt-BR": "ring-green-500",
  "en-US": "ring-blue-500",
  "es-US": "ring-yellow-500",
};

interface FlagSelectorProps {
  onLanguageChange?: (locale: Locale) => void;
}

export function FlagSelector({ onLanguageChange }: FlagSelectorProps) {
  const { locale } = useLanguage();
  const strings = i18n[locale];

  function handleSelect(newLocale: Locale) {
    if (newLocale === locale) return;
    onLanguageChange?.(newLocale);
  }

  return (
    <div
      className="flex gap-2"
      role="radiogroup"
      aria-label={strings.accessibility.flagSelector}
    >
      {LOCALES.map((loc) => {
        const isActive = locale === loc;
        return (
          <button
            key={loc}
            onClick={() => handleSelect(loc)}
            role="radio"
            aria-checked={isActive}
            aria-label={strings.flags[loc]}
            title={strings.flags[loc]}
            className={`
              w-12 h-12 flex items-center justify-center rounded-full
              transition-all duration-200 ease-out
              hover:scale-110 active:scale-95
              cursor-pointer select-none
              ${isActive ? `ring-2 ${RING_COLORS[loc]} bg-[var(--color-bg-card)] shadow-lg` : "hover:bg-[var(--color-bg-card)]/50"}
            `}
          >
            <Flag locale={loc} size={28} />
          </button>
        );
      })}
    </div>
  );
}
