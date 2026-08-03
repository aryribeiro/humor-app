"use client";

import { i18n, Locale } from "@/lib/i18n";

type VoiceState = "idle" | "listening" | "speaking" | "connecting";

interface VoiceButtonProps {
  state: VoiceState;
  locale: Locale;
  onClick: () => void;
  disabled?: boolean;
}

export function VoiceButton({ state, locale, onClick, disabled }: VoiceButtonProps) {
  const strings = i18n[locale];

  const stateConfig = {
    idle: {
      label: strings.idleLabel,
      ariaLabel: strings.accessibility.micButton,
      bgClass: "bg-[var(--color-accent-purple)] hover:bg-[var(--color-accent-pink)]",
      icon: "🎤",
    },
    listening: {
      label: strings.listeningLabel,
      ariaLabel: strings.accessibility.micButtonActive,
      bgClass: "bg-red-500",
      icon: "🎤",
    },
    speaking: {
      label: strings.speakingLabel,
      ariaLabel: strings.speakingLabel,
      bgClass: "bg-[var(--color-accent-blue)] hover:bg-red-500",
      icon: "🔊",
    },
    connecting: {
      label: strings.connectingLabel,
      ariaLabel: strings.connectingLabel,
      bgClass: "bg-[var(--color-warning)]",
      icon: "⏳",
    },
  };

  const config = stateConfig[state];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {state === "listening" && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" />
        )}
        <button
          onClick={onClick}
          disabled={disabled || state === "connecting"}
          aria-label={config.ariaLabel}
          aria-pressed={state === "listening"}
          aria-busy={state === "connecting"}
          className={`
            relative z-10
            w-20 h-20 md:w-24 md:h-24
            rounded-full flex items-center justify-center
            text-3xl text-white
            transition-all duration-200
            shadow-lg shadow-purple-500/25
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            ${config.bgClass}
          `}
        >
          {config.icon}
        </button>
      </div>
      <span className="text-sm text-[var(--color-text-secondary)] animate-fade-in">
        {config.label}
      </span>
    </div>
  );
}
