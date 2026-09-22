import type { Metadata } from "next";
import { Montserrat, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import React from "react";

// Official UIUC Brand Typography: Montserrat (Headlines) & Source Sans 3 (Body)
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Research Portal | University of Illinois Urbana-Champaign",
  description:
    "Official Research Intelligence Portal of the University of Illinois Urbana-Champaign (UIUC). Explore 20,000+ publications, active faculty research directories, citation analytics, and an AI Research Assistant grounded in OpenAlex scholarly records.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning className={`${montserrat.variable} ${sourceSans.variable}`}>
      <body
        className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0A1120] dark:text-slate-100 antialiased selection:bg-[#FF5F05] selection:text-white"
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
