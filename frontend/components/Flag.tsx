"use client";

import { Locale } from "@/lib/i18n";

const FLAGS: Record<Locale, { src: string; alt: string }> = {
  "pt-BR": { src: "/flags/br.png", alt: "Brasil" },
  "en-US": { src: "/flags/us.png", alt: "USA" },
  "es-US": { src: "/flags/es.png", alt: "Español" },
};

interface FlagProps {
  locale: Locale;
  size?: number;
}

export function Flag({ locale, size = 28 }: FlagProps) {
  const { src, alt } = FLAGS[locale];
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="inline-block rounded-sm object-cover"
      style={{ width: size, height: size }}
    />
  );
}
