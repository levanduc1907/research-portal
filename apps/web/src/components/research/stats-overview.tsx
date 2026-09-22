"use client";

import React from "react";
import { BookOpen, Quote, Users, Layers, TrendingUp } from "lucide-react";
import { AnalyticsStatsDto } from "@repo/contracts";

interface StatsOverviewProps {
  stats: AnalyticsStatsDto | null;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    {
      title: "Total Publications",
      value: stats ? stats.totalPapers.toLocaleString() : "339,538",
      subtext: "From OpenAlex record lineage",
      icon: BookOpen,
      color: "from-blue-500 to-indigo-600",
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Global Citations",
      value: stats ? (stats.totalCitations / 1000000).toFixed(1) + " Million" : "33.1 Million",
      subtext: `h-index: ${stats?.hIndex || 1413} • i10-index: ${(stats?.i10Index || 385078).toLocaleString()}`,
      icon: Quote,
      color: "from-orange-500 to-amber-600",
      textColor: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Faculty & Researchers",
      value: stats ? stats.totalResearchers.toLocaleString() + "+" : "1,250+",
      subtext: "Pioneering faculty across 15 colleges",
      icon: Users,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Active Research Topics",
      value: stats ? stats.totalTopics.toLocaleString() : "185",
      subtext: "Covering Physical, Life & Social Sciences",
      icon: Layers,
      color: "from-purple-500 to-pink-600",
      textColor: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <section id="overview" className="py-12 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.bgColor} ${c.textColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    Top R1
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {c.value}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {c.title}
                </p>
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
