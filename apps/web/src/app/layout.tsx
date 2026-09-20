import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { I18nProvider } from "../lib/i18n/context";
import { AuthProvider } from "../context/auth-context";
import { NotesProvider } from "../context/notes-context";

import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChaosNote - Auto-Saving Workspace & BullMQ Cronjobs",
  description: "Modern Turborepo Monorepo with NestJS API, BullMQ & Redis Worker, Next.js Web, and React Native Mobile",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <AuthProvider>
              <NotesProvider>{children}</NotesProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
