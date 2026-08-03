import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LanguageProvider } from "@/hooks/useLanguage";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Humor App!",
  description:
    "Web app trilíngue de piadas com voz | Trilingual joke web app with voice | App trilingüe de chistes con voz",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#7c3aed" />
      </head>
      <body className={`${inter.className} gradient-bg min-h-dvh`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
