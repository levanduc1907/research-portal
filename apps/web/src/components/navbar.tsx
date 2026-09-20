"use client";

import React from "react";
import { useI18n } from "../lib/i18n/context";
import { useAuth } from "../context/auth-context";
import { useNotes } from "../context/notes-context";
import { useTheme } from "next-themes";
import {
  Search,
  Moon,
  Sun,
  Globe,
  Sparkles,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Users2,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { user, loginWithGoogle, loginWithDemo, logout } = useAuth();
  const { search, setSearch, saveStatus } = useNotes();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/70">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6F8863] text-white shadow-md shadow-[#6F8863]/25 font-bold text-lg dark:bg-[#A3B899] dark:text-slate-900">
            🌿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100 font-serif">
                ChaosNote
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#A3B899]/25 px-2 py-0.5 text-[10px] font-bold text-[#3B4E33] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
                <Users2 className="h-3 w-3" />
                Teams
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, channels & documents..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs text-slate-800 placeholder-slate-400 focus:border-[#A3B899] focus:outline-none focus:ring-2 focus:ring-[#A3B899]/20 transition-all dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Auto-save Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100/80 border border-slate-200/60 dark:bg-slate-800/80 dark:border-slate-700/60">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">{t.saving}</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="h-3 w-3 text-[#6F8863] dark:text-[#A3B899]" />
                <span className="text-[#4D6343] dark:text-[#A3B899]">{t.saved}</span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <AlertCircle className="h-3 w-3 text-slate-400" />
                <span className="text-slate-500">{t.unsaved}</span>
              </>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="flex h-8 items-center gap-1 rounded-xl border border-slate-200/80 bg-white/80 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>{locale.toUpperCase()}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-[#A3B899]/30 text-xs font-bold text-[#3B4E33] dark:text-[#A3B899]">
                  {user.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight line-clamp-1 text-slate-800 dark:text-slate-100">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 line-clamp-1">
                  {user.email}
                </span>
              </div>
              <button
                onClick={logout}
                title={t.signOut}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={loginWithGoogle}
                className="h-8 text-xs font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 shadow-xs"
              >
                <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {t.signInWithGoogle}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loginWithDemo}
                className="h-8 text-xs font-semibold"
              >
                {t.devQuickLogin}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
