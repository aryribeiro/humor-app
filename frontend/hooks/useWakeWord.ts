"use client";

import { useState, useEffect, useRef } from "react";
import { Locale } from "@/lib/i18n";

const WAKE_PHRASES: Record<Locale, string[]> = {
  "pt-BR": ["ativa o microfone", "ativar microfone", "ativa microfone"],
  "en-US": ["activate the microphone", "activate microphone"],
  "es-US": ["activa el microfono", "activar microfono", "activa microfono"],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

interface UseWakeWordOptions {
  locale: Locale;
  enabled: boolean;
  onWakeWord: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type SRConstructor = new () => any;

export function useWakeWord({ locale, enabled, onWakeWord }: UseWakeWordOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const onWakeWordRef = useRef(onWakeWord);
  onWakeWordRef.current = onWakeWord;

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setIsSupported(supported);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const win = window as any;
    const SR: SRConstructor | undefined = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = locale;
    recognition.maxAlternatives = 3;

    const phrases = WAKE_PHRASES[locale].map(normalize);
    let active = true;

    recognition.onresult = (event: any) => {
      if (!active) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        for (let j = 0; j < result.length; j++) {
          const transcript = normalize(result[j].transcript);
          if (phrases.some((p: string) => transcript.includes(p))) {
            active = false;
            recognition.stop();
            onWakeWordRef.current();
            return;
          }
        }
      }
    };

    recognition.onend = () => {
      if (active) {
        try {
          recognition.start();
        } catch {
          // already running or disposed
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-available") {
        active = false;
      }
    };

    try {
      recognition.start();
    } catch {
      return;
    }

    return () => {
      active = false;
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    };
  }, [locale, enabled]);

  return { isSupported };
}
