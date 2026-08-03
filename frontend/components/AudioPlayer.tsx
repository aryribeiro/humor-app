"use client";

import { useRef, useCallback, useEffect } from "react";

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

interface AudioPlayerHandle {
  play: (base64Audio: string) => void;
  clear: () => void;
  init: () => Promise<void>;
}

interface AudioPlayerProps {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  playerRef: React.MutableRefObject<AudioPlayerHandle | null>;
}

export function AudioPlayer({ onPlaybackStart, onPlaybackEnd, playerRef }: AudioPlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isPlayingRef = useRef(false);
  const onPlaybackStartRef = useRef(onPlaybackStart);
  const onPlaybackEndRef = useRef(onPlaybackEnd);

  onPlaybackStartRef.current = onPlaybackStart;
  onPlaybackEndRef.current = onPlaybackEnd;

  const init = useCallback(async () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      return;
    }

    const audioContext = new AudioContext({ sampleRate: 24000 });
    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule("/worklets/audio-player-processor.js");

    const workletNode = new AudioWorkletNode(audioContext, "audio-player-processor");
    workletNodeRef.current = workletNode;

    workletNode.port.onmessage = (event) => {
      if (event.data.type === "ended") {
        isPlayingRef.current = false;
        onPlaybackEndRef.current?.();
      }
    };

    workletNode.connect(audioContext.destination);
  }, []);

  const play = useCallback((base64Audio: string) => {
    if (!workletNodeRef.current) return;

    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      onPlaybackStartRef.current?.();
    }

    const samples = base64ToFloat32(base64Audio);
    workletNodeRef.current.port.postMessage({ type: "audio", samples });
  }, []);

  const clear = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: "clear" });
    }
    isPlayingRef.current = false;
  }, []);

  useEffect(() => {
    playerRef.current = { play, clear, init };
  }, [play, clear, init, playerRef]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return null;
}
