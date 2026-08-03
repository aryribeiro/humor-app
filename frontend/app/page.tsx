"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useWakeWord } from "@/hooks/useWakeWord";
import { i18n, Locale } from "@/lib/i18n";
import { voiceConfig } from "@/lib/voiceConfig";
import { FlagSelector } from "@/components/FlagSelector";
import { Flag } from "@/components/Flag";
import { VoiceButton } from "@/components/VoiceButton";
import { AudioPlayer } from "@/components/AudioPlayer";

function FirefoxWarning() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border-4 border-[var(--color-accent-purple)] p-8 text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">🎭 Humor App!</h1>
          <p className="text-6xl mt-4">🦊</p>
        </div>

        <div className="space-y-6 text-[var(--color-text-secondary)]">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-text-primary)]">
              🇧🇷 Navegador incompatível
            </p>
            <p className="text-sm">
              O Humor App! utiliza recursos de áudio em tempo real que não são suportados pelo Firefox.
              Por favor, use <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, <strong>Safari</strong> ou <strong>Opera</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-text-primary)]">
              🇺🇸 Unsupported browser
            </p>
            <p className="text-sm">
              Humor App! uses real-time audio features not supported by Firefox.
              Please use <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, <strong>Safari</strong>, or <strong>Opera</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-text-primary)]">
              🇪🇸 Navegador incompatible
            </p>
            <p className="text-sm">
              Humor App! utiliza funciones de audio en tiempo real que no son compatibles con Firefox.
              Por favor, usa <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, <strong>Safari</strong> u <strong>Opera</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="py-3 text-center text-xs text-[var(--color-text-secondary)] italic">
        por <a href="https://www.linkedin.com/in/aryribeiro" target="_blank" rel="noopener noreferrer" className="font-bold not-italic hover:text-[var(--color-accent-purple)] transition-colors">Ary Ribeiro</a>
      </div>
    </div>
  );
}

function HumorApp() {
  const { locale, setLocale } = useLanguage();
  const strings = i18n[locale];
  const [isTransitioning, setIsTransitioning] = useState(false);

  const voiceRef = useRef<ReturnType<typeof useVoiceSession> | null>(null);

  const doLanguageChange = useCallback(
    (newLocale: Locale) => {
      setIsTransitioning(true);
      setLocale(newLocale);
      voiceRef.current?.changeLanguage(newLocale);
      setTimeout(() => setIsTransitioning(false), 150);
    },
    [setLocale]
  );

  const handleServerLanguageChange = useCallback(
    (newLocale: Locale) => {
      setIsTransitioning(true);
      setLocale(newLocale);
      setTimeout(() => setIsTransitioning(false), 150);
    },
    [setLocale]
  );

  const voice = useVoiceSession({
    locale,
    onLanguageCommand: handleServerLanguageChange,
  });

  voiceRef.current = voice;

  const handleMicClick = useCallback(() => {
    if (voiceRef.current?.isSpeaking) {
      voiceRef.current.stopSpeaking();
    } else if (voiceRef.current?.isListening || voiceRef.current?.isCapturing) {
      voiceRef.current.stopListening();
    } else {
      voiceRef.current?.startListening();
    }
  }, []);

  const getVoiceState = (): "idle" | "listening" | "speaking" | "connecting" => {
    if (voice.isSpeaking) return "speaking";
    if (voice.isListening || voice.isCapturing) return "listening";
    if (!voice.isConnected) return "connecting";
    return "idle";
  };

  useKeyboardNav({
    onLanguageChange: doLanguageChange,
    onToggleMic: handleMicClick,
    onStopSpeaking: voice.stopSpeaking,
  });

  const { isSupported: wakeWordSupported } = useWakeWord({
    locale,
    enabled: !voice.isSpeaking && !voice.isListening && !voice.isCapturing && voice.isConnected,
    onWakeWord: handleMicClick,
  });

  return (
    <div className="min-h-dvh flex flex-col p-4">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-accent-purple)] focus:text-white focus:rounded"
      >
        {strings.accessibility.skipToContent}
      </a>

      <div className="flex-1 flex flex-col rounded-2xl border-4 border-[var(--color-accent-purple)]">
        <header className="px-6 py-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold gradient-text">
              🎭 {strings.appName}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {strings.subtitle}
            </p>
          </div>
          <div className="flex justify-end mt-2">
            <FlagSelector onLanguageChange={doLanguageChange} />
          </div>
        </header>

        <main
          id="main-content"
          className={`flex-1 flex flex-col items-center justify-center px-6 gap-8 transition-opacity duration-200 ${
            isTransitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="text-center animate-fade-in">
            <p className="text-xl text-[var(--color-text-secondary)]">
              {strings.heroText}
            </p>
          </div>

          <div id="voice-control">
            <VoiceButton
              state={getVoiceState()}
              locale={locale}
              onClick={handleMicClick}
            />
          </div>

          <div className="text-sm text-[var(--color-text-secondary)] animate-fade-in text-center space-y-1">
            {wakeWordSupported && <p>{strings.wakeHint}</p>}
            <p>{strings.changeLangHint}</p>
            <p>{strings.stopHint}</p>
          </div>

          {voice.error && (
            <p className="text-sm text-[var(--color-error)] animate-fade-in">
              {voice.error}
            </p>
          )}
        </main>

        <div className="px-6 py-3 border-t border-[var(--color-border)]/30">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-success)]" />
            {voiceConfig[locale].label}
            <span className="hidden md:contents">
              • <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-card)] text-[10px]">Alt+1</kbd> <Flag locale="pt-BR" size={14} />
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-card)] text-[10px]">Alt+2</kbd> <Flag locale="en-US" size={14} />
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-card)] text-[10px]">Alt+3</kbd> <Flag locale="es-US" size={14} />
              • 🔌 <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-card)] text-[10px]">Alt+4</kbd>
            </span>
          </div>
        </div>

      </div>

      <div className="py-3 text-center text-xs text-[var(--color-text-secondary)] italic">
        por <a href="https://www.linkedin.com/in/aryribeiro" target="_blank" rel="noopener noreferrer" className="font-bold not-italic hover:text-[var(--color-accent-purple)] transition-colors">Ary Ribeiro</a>
      </div>

      <AudioPlayer
        playerRef={voice.playerRef}
        onPlaybackStart={voice.handlePlaybackStart}
        onPlaybackEnd={voice.handlePlaybackEnd}
      />

      <div aria-live="polite" aria-atomic="true" className="sr-only" id="status-announcer" />
      <div aria-live="assertive" aria-atomic="true" className="sr-only" id="alert-announcer" />
    </div>
  );
}

export default function Home() {
  const [isFirefox, setIsFirefox] = useState<boolean | null>(null);

  useEffect(() => {
    setIsFirefox(/firefox/i.test(navigator.userAgent));
  }, []);

  if (isFirefox === null) return null;
  if (isFirefox) return <FirefoxWarning />;
  return <HumorApp />;
}
