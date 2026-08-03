"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string | null;
  duration?: number;
}

export function Toast({ message, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  if (!visible || !currentMessage) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)]/50 text-sm text-[var(--color-text-primary)] shadow-xl animate-fade-in"
      role="status"
      aria-live="polite"
    >
      {currentMessage}
    </div>
  );
}
