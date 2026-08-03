import { Locale } from "./i18n";

export type VoiceId = "carolina" | "tiffany" | "lupe";

export const voiceConfig = {
  "pt-BR": { voiceId: "carolina" as const, label: "Carolina", flag: "🇧🇷" },
  "en-US": { voiceId: "tiffany" as const, label: "Tiffany", flag: "🇺🇸" },
  "es-US": { voiceId: "lupe" as const, label: "Lupe", flag: "🇪🇸" },
} as const;

export function getVoiceForLocale(locale: Locale): VoiceId {
  return voiceConfig[locale].voiceId;
}
