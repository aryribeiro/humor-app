"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { WsClient, createWsClient } from "@/lib/wsClient";
import { useAudioWorklet } from "./useAudioWorklet";
import { Locale } from "@/lib/i18n";

interface UseVoiceSessionOptions {
  locale: Locale;
  onLanguageCommand?: (locale: Locale) => void;
}

export function useVoiceSession({ locale, onLanguageCommand }: UseVoiceSessionOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WsClient | null>(null);
  const playerRef = useRef<{ play: (b64: string) => void; clear: () => void; init: () => Promise<void> } | null>(null);
  const localeRef = useRef(locale);
  const onLanguageCommandRef = useRef(onLanguageCommand);

  localeRef.current = locale;
  onLanguageCommandRef.current = onLanguageCommand;

  const handleAudioChunk = useCallback((base64: string) => {
    wsRef.current?.emit("audio_chunk", { data: base64 });
  }, []);

  const { startCapture, stopCapture, isCapturing } = useAudioWorklet({
    onAudioChunk: handleAudioChunk,
    onError: (msg) => setError(msg),
  });

  const stopCaptureRef = useRef(stopCapture);
  stopCaptureRef.current = stopCapture;

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";
    const client = createWsClient({
      url: wsUrl,
      onMessage: (event: string, data: unknown) => {
        const msg = data as Record<string, unknown>;

        switch (event) {
          case "session_created":
            break;
          case "audio_output":
            if (msg && typeof msg.data === "string") {
              playerRef.current?.play(msg.data);
            }
            break;
          case "navigation_command":
            if (msg && typeof msg.locale === "string") {
              onLanguageCommandRef.current?.(msg.locale as Locale);
            }
            break;
          case "interrupted":
            playerRef.current?.clear();
            setIsSpeaking(false);
            break;
          case "stop_requested":
            playerRef.current?.clear();
            setIsSpeaking(false);
            setIsListening(false);
            stopCaptureRef.current?.();
            break;
          case "language_changed":
            playerRef.current?.clear();
            setIsSpeaking(false);
            break;
          case "listening_started":
            setIsListening(true);
            break;
          case "listening_stopped":
            setIsListening(false);
            stopCaptureRef.current?.();
            break;
          case "error_msg":
            setError(msg && typeof msg.message === "string" ? msg.message : "Unknown error");
            break;
          case "pong_msg":
            break;
        }
      },
      onOpen: () => {
        setIsConnected(true);
        setError(null);
      },
      onClose: () => {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        playerRef.current?.clear();
        stopCaptureRef.current?.();
      },
      onReconnect: () => {
        setError(null);
        setIsListening(false);
        setIsSpeaking(false);
        playerRef.current?.clear();
        stopCaptureRef.current?.();
      },
      onError: () => setError("Connection failed"),
    });

    wsRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

  const startingRef = useRef(false);

  const startListening = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      setError(null);
      await playerRef.current?.init();
      await startCapture();
      wsRef.current?.emit("start_listening");
    } finally {
      startingRef.current = false;
    }
  }, [startCapture]);

  const stopListening = useCallback(() => {
    stopCapture();
    wsRef.current?.emit("stop_listening");
  }, [stopCapture]);

  const changeLanguage = useCallback((newLocale: Locale) => {
    wsRef.current?.emit("set_language", { locale: newLocale });
  }, []);

  const stopSpeaking = useCallback(() => {
    playerRef.current?.clear();
    setIsSpeaking(false);
    stopCapture();
    wsRef.current?.emit("stop_listening");
    setIsListening(false);
  }, [stopCapture]);

  const handlePlaybackStart = useCallback(() => setIsSpeaking(true), []);
  const handlePlaybackEnd = useCallback(() => setIsSpeaking(false), []);

  return {
    isConnected,
    isListening,
    isCapturing,
    isSpeaking,
    error,
    startListening,
    stopListening,
    changeLanguage,
    stopSpeaking,
    playerRef,
    handlePlaybackStart,
    handlePlaybackEnd,
  };
}
