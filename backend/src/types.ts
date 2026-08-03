export type Locale = "pt-BR" | "en-US" | "es-US";

export type VoiceId = "carolina" | "tiffany" | "lupe";

export interface SessionState {
  sessionId: string;
  locale: Locale;
  voiceId: VoiceId;
  isListening: boolean;
  createdAt: number;
  lastActivity: number;
}