"use client";

import { useState, useRef, useCallback } from "react";

function pcmToBase64(int16Buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(int16Buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface UseAudioWorkletOptions {
  onAudioChunk: (base64: string) => void;
  onError?: (error: string) => void;
}

export function useAudioWorklet({ onAudioChunk, onError }: UseAudioWorkletOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/worklets/audio-processor.js");

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(audioContext, "audio-capture-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        if (event.data.type === "audio") {
          const base64 = pcmToBase64(event.data.samples);
          onAudioChunk(base64);
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      setIsCapturing(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Microphone access failed";
      setError(message);
      onError?.(message);
    }
  }, [onAudioChunk, onError]);

  const stopCapture = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  return { startCapture, stopCapture, isCapturing, error };
}
