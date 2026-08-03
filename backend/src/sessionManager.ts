import { randomUUID } from "crypto";
import { Locale, VoiceId, SessionState } from "./types";

const localeToVoice: Record<Locale, VoiceId> = {
  "pt-BR": "carolina",
  "en-US": "tiffany",
  "es-US": "lupe",
};

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map();

  createSession(): SessionState {
    const sessionId = randomUUID();
    const now = Date.now();

    const session: SessionState = {
      sessionId,
      locale: "pt-BR",
      voiceId: "carolina",
      isListening: false,
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<Pick<SessionState, "locale" | "voiceId" | "isListening">>): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    if (updates.locale) {
      session.locale = updates.locale;
      session.voiceId = localeToVoice[updates.locale];
    }
    if (updates.voiceId) {
      session.voiceId = updates.voiceId;
    }
    if (updates.isListening !== undefined) {
      session.isListening = updates.isListening;
    }

    session.lastActivity = Date.now();
    return session;
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  static getVoiceForLocale(locale: Locale): VoiceId {
    return localeToVoice[locale];
  }
}
