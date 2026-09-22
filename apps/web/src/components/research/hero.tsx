"use client";

import React from "react";
import { Sparkles, ArrowRight, Award, Compass, Search, GraduationCap, Globe, BookOpen } from "lucide-react";
import { InstitutionDto } from "@repo/contracts";
import { BlockILogo } from "./illinois-logo";

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
  const meanCite = institution?.twoYearMeanCite ? institution.twoYearMeanCite.toFixed(2) : "3.77";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#13294B] via-[#0E1F3B] to-[#0A162B] text-white py-16 sm:py-20 lg:py-24 border-b-4 border-[#FF5F05]">
      {/* Background Architectural Grid & Subtle Illini Orange Aura */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(#FF5F05_1px,transparent_1px)] [background-size:24px_24px]" 
        aria-hidden="true"
      />
      <div 
        className="pointer-events-none absolute -top-40 right-10 w-[600px] h-[600px] bg-[#FF5F05]/15 rounded-full blur-3xl" 
        aria-hidden="true"
      />
      <div 
        className="pointer-events-none absolute -bottom-32 left-10 w-[500px] h-[500px] bg-[#1D5F8A]/25 rounded-full blur-3xl" 
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white shadow-lg mb-6">
            <BlockILogo className="w-3.5 h-4.5" withOutline={false} />
            <span className="text-[#FF5F05] font-extrabold uppercase tracking-wide">ILLINOIS</span>
            <span className="text-white/40">•</span>
            <span>Carnegie R1 Classification: Very High Research Activity</span>
          </div>

          {/* Main University Research Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12] font-heading">
            RESEARCH THAT RESHAPES <br className="hidden sm:inline" />
            <span className="text-[#FF5F05] underline decoration-[#FF5F05]/40 underline-offset-8">
              THE WORLD
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed font-normal">
            From the dawn of supercomputing and web browsers to breakthroughs in quantum physics, 
            crop photosynthesis, and artificial intelligence — explore over 
            <span className="text-[#FF5F05] font-bold"> {works}</span> peer-reviewed publications from the 
            University of Illinois Urbana-Champaign.
          </p>

          {/* Institutional Stats Ribbon */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-center transition-all hover:border-[#FF5F05]/60 hover:bg-white/15">
              <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                {works}
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold mt-1">
                Total Works
              </div>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-center transition-all hover:border-[#FF5F05]/60 hover:bg-white/15">
              <div className="text-2xl sm:text-3xl font-black text-[#FF5F05] font-heading">
                {citations}
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold mt-1">
                Citations
              </div>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-center transition-all hover:border-[#FF5F05]/60 hover:bg-white/15">
              <div className="text-2xl sm:text-3xl font-black text-white font-heading">
                {hIndex}
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold mt-1">
                h-index
              </div>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-center transition-all hover:border-[#FF5F05]/60 hover:bg-white/15">
              <div className="text-2xl sm:text-3xl font-black text-[#FF5F05] font-heading">
                {meanCite}
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold mt-1">
                2-Yr Mean Cite
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#papers"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5F05] px-7 py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-xl shadow-orange-950/30 hover:bg-[#E84A27] transition-all hover:-translate-y-0.5"
            >
              <Search className="w-4 h-4" />
              <span>Explore Research Papers</span>
            </a>

            <button
              onClick={onOpenAssistant}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-[#13294B]/80 backdrop-blur-sm px-7 py-4 text-sm font-extrabold uppercase tracking-wider text-white hover:border-[#FF5F05] hover:bg-[#13294B] transition-all hover:-translate-y-0.5 shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-[#FF5F05]" />
              <span>Ask AI Research Assistant</span>
              <ArrowRight className="w-4 h-4 text-[#FF5F05]" />
            </button>
          </div>

          {/* Quick Filter Tags */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">Focus Areas:</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/20 transition-colors cursor-pointer">
              Artificial Intelligence
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/20 transition-colors cursor-pointer">
              Parallel Computing
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/20 transition-colors cursor-pointer">
              Crop Photosynthesis
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/20 transition-colors cursor-pointer">
              Quantum Physics
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
