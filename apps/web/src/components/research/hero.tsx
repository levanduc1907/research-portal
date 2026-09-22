"use client";

import React from "react";
import { Sparkles, ArrowRight, Award, Compass, Search } from "lucide-react";
import { InstitutionDto } from "@repo/contracts";

interface HeroProps {
  institution: InstitutionDto | null;
  onSearchFocus?: () => void;
  onOpenAssistant?: () => void;
}

export function Hero({ institution, onOpenAssistant }: HeroProps) {
  const works = institution?.worksCount
    ? institution.worksCount.toLocaleString()
    : "339,538";
  const citations = institution?.citedByCount
    ? (institution.citedByCount / 1000000).toFixed(1) + "M+"
    : "33.1M+";
  const hIndex = institution?.hIndex || 1413;

  return (
    <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-orange-50/40 via-white to-white py-16 dark:border-slate-800/80 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950">
      {/* Background glow mesh */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-orange-400/15 via-blue-500/10 to-indigo-500/15 blur-3xl opacity-70" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-100/70 px-3.5 py-1 text-xs font-semibold text-orange-800 shadow-sm dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-300 mb-6">
            <Award className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span>Top Tier Research Institution • R1 Carnegie Classification</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Pioneering Discoveries at{" "}
            <span className="bg-gradient-to-r from-[#13294B] via-orange-600 to-[#FF5F05] bg-clip-text text-transparent dark:from-blue-400 dark:via-orange-400 dark:to-amber-300">
              Illinois
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Explore {works} verified research publications, breakthroughs in
            supercomputing, quantum hardware, and agricultural resilience, or ask
            grounded questions to the UIUC AI Assistant.
          </p>

          {/* Quick Stats Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 shadow-sm border border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-800">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {works}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Published Works
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 shadow-sm border border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-800">
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {citations}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total Citations
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 shadow-sm border border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-800">
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {hIndex}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Institution h-index
              </span>
            </div>
          </div>

          {/* Call to actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#papers"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-orange-500 hover:to-amber-500 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Explore Research Papers</span>
            </a>

            <button
              onClick={onOpenAssistant}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Ask AI Assistant</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
