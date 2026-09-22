"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Sparkles, ExternalLink, BookOpen, Users, BarChart3 } from "lucide-react";

interface HeaderProps {
  onOpenAssistant?: () => void;
}

export function Header({ onOpenAssistant }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#13294B] to-[#FF5F05] text-white shadow-md shadow-orange-500/20 font-black text-xl tracking-tighter">
            I
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                UIUC Research
              </span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                Live OpenAlex
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              University of Illinois Urbana-Champaign
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a
            href="#overview"
            className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </a>
          <a
            href="#papers"
            className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            Papers
          </a>
          <a
            href="#faculty"
            className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            Faculty
          </a>
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3.5 py-1 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-all font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a
            href="https://openalex.org/institutions/I157725225"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <span>OpenAlex Profile</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
