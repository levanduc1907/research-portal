"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Sparkles, ExternalLink, BookOpen, Users, BarChart3 } from "lucide-react";
import { BlockILogo } from "./illinois-logo";

interface HeaderProps {
  onOpenAssistant?: () => void;
}

export function Header({ onOpenAssistant }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full shadow-md">
      {/* Top Brand Stripe (Authentic illinois.edu Deep Navy Bar) */}
      <div className="w-full bg-[#13294B] border-b border-[#0C1A30] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5">
            <a
              href="https://illinois.edu"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 group focus:outline-none"
              title="University of Illinois Urbana-Champaign Homepage"
            >
              <div className="transition-transform group-hover:scale-105 duration-200">
                <BlockILogo className="w-7 h-9 drop-shadow-sm" />
              </div>
            </a>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-white font-heading">
                  University of Illinois
                </span>
                <span className="hidden md:inline-block rounded bg-[#FF5F05] px-2 py-0.5 text-[10px] font-bold text-white tracking-wide uppercase shadow-sm">
                  Research Portal
                </span>
              </div>
              <p className="text-[11px] text-white/80 tracking-wide font-medium">
                Urbana-Champaign • Office of the Vice Chancellor for Research
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-white/90">
            <a
              href="#overview"
              className="hover:text-[#FF5F05] transition-colors flex items-center gap-1.5 py-1 relative group"
            >
              <BarChart3 className="w-4 h-4 text-[#FF5F05]" />
              <span>Analytics</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF5F05] transition-all group-hover:w-full" />
            </a>

            <a
              href="#papers"
              className="hover:text-[#FF5F05] transition-colors flex items-center gap-1.5 py-1 relative group"
            >
              <BookOpen className="w-4 h-4 text-[#FF5F05]" />
              <span>Papers Explorer</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF5F05] transition-all group-hover:w-full" />
            </a>

            <a
              href="#faculty"
              className="hover:text-[#FF5F05] transition-colors flex items-center gap-1.5 py-1 relative group"
            >
              <Users className="w-4 h-4 text-[#FF5F05]" />
              <span>Faculty Directory</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF5F05] transition-all group-hover:w-full" />
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAssistant}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5F05] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#E84A27] active:scale-95 transition-all shadow-md shadow-orange-950/20"
              title="Open Illinois AI Research Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Ask AI Assistant</span>
              <span className="sm:hidden">AI</span>
            </button>

            {/* External OpenAlex */}
            <a
              href="https://openalex.org/institutions/I157725225"
              target="_blank"
              rel="noreferrer"
              className="hidden xl:inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
              title="View UIUC profile on OpenAlex"
            >
              <span>OpenAlex</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle visual theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all focus:ring-2 focus:ring-[#FF5F05]"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-300" />
              ) : (
                <Moon className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-bar / Institutional Breadcrumb Ribbon */}
      <div className="w-full bg-[#FF5F05] text-white py-1 px-4 sm:px-6 lg:px-8 text-xs font-bold flex items-center justify-between shadow-inner">
        <div className="mx-auto max-w-7xl w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider">
            <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Official Research Portal • Carnegie R1 Highest Research Activity</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px]">
            <span>OpenAlex Index: 2024–2026</span>
            <span>•</span>
            <span>Institution ID: I157725225</span>
          </div>
        </div>
      </div>
    </header>
  );
}
