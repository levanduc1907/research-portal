"use client";

import React from "react";
import { BookOpen, Quote, Users, Layers, Award } from "lucide-react";
import { AnalyticsStatsDto } from "@repo/contracts";

interface StatsOverviewProps {
  stats: AnalyticsStatsDto | null;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    {
      title: "Total Publications",
      value: stats ? stats.totalPapers.toLocaleString() : "339,538",
      subtext: "OpenAlex peer-reviewed catalog",
      icon: BookOpen,
      borderAccent: "border-t-4 border-t-[#13294B]",
      iconBg: "bg-[#13294B]/10 text-[#13294B] dark:bg-white/10 dark:text-white",
      valueColor: "text-[#13294B] dark:text-white",
    },
    {
      title: "Global Citations",
      value: stats ? (stats.totalCitations / 1000000).toFixed(1) + "M+" : "33.1M+",
      subtext: `h-index: ${stats?.hIndex || 1413} • i10: ${(stats?.i10Index || 385078).toLocaleString()}`,
      icon: Quote,
      borderAccent: "border-t-4 border-t-[#FF5F05]",
      iconBg: "bg-[#FF5F05]/10 text-[#FF5F05]",
      valueColor: "text-[#FF5F05]",
    },
    {
      title: "Faculty Researchers",
      value: stats ? stats.totalResearchers.toLocaleString() + "+" : "1,250+",
      subtext: "Across 15 colleges & institutes",
      icon: Users,
      borderAccent: "border-t-4 border-t-[#13294B]",
      iconBg: "bg-[#13294B]/10 text-[#13294B] dark:bg-white/10 dark:text-white",
      valueColor: "text-[#13294B] dark:text-white",
    },
    {
      title: "Research Disciplines",
      value: stats ? stats.totalTopics.toLocaleString() : "185",
      subtext: "Physical, Life & Social Sciences",
      icon: Layers,
      borderAccent: "border-t-4 border-t-[#FF5F05]",
      iconBg: "bg-[#FF5F05]/10 text-[#FF5F05]",
      valueColor: "text-[#FF5F05]",
    },
  ];

  return (
    <section id="overview" className="py-10 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0E1726]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-[#132038] ${c.borderAccent}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center text-[11px] font-bold text-[#FF5F05] uppercase tracking-wider gap-1">
                    <Award className="w-3.5 h-3.5" />
                    R1 Metric
                  </span>
                </div>
                <div className={`text-3xl font-extrabold tracking-tight font-heading ${c.valueColor}`}>
                  {c.value}
                </div>
                <h3 className="mt-1 text-sm font-bold text-[#13294B] dark:text-white">
                  {c.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {c.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
