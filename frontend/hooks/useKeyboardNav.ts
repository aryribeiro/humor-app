"use client";

import { useEffect } from "react";
import { Locale } from "@/lib/i18n";

interface UseKeyboardNavOptions {
  onLanguageChange: (locale: Locale) => void;
  onToggleMic?: () => void;
  onStopSpeaking?: () => void;
  disabled?: boolean;
}

export function useKeyboardNav({
  onLanguageChange,
  onToggleMic,
  onStopSpeaking,
  disabled = false,
}: UseKeyboardNavOptions) {
  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        onLanguageChange("pt-BR");
      } else if (e.altKey && e.key === "2") {
        e.preventDefault();
        onLanguageChange("en-US");
      } else if (e.altKey && e.key === "3") {
        e.preventDefault();
        onLanguageChange("es-US");
      } else if (e.altKey && e.key === "4") {
        e.preventDefault();
        onToggleMic?.();
      } else if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        onToggleMic?.();
      } else if (e.key === "Escape") {
        onStopSpeaking?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, onLanguageChange, onToggleMic, onStopSpeaking]);
}
