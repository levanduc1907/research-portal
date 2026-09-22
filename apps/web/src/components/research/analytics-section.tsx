"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, PieChart, Info, Filter } from "lucide-react";
import { PublicationYearTrendDto, TopicTrendDto } from "@repo/contracts";

interface AnalyticsSectionProps {
  trends: PublicationYearTrendDto[];
  topics: TopicTrendDto[];
  onSelectTopic?: (topicName: string) => void;
}

export function AnalyticsSection({
  trends,
  topics,
  onSelectTopic,
}: AnalyticsSectionProps) {
  const [activeTab, setActiveTab] = useState<"topics" | "trends">("topics");

  const maxTrendCount = Math.max(...trends.map((t) => t.count), 1);
  const maxCitationCount = Math.max(...trends.map((t) => t.citedCount), 1);

  return (
    <section className="py-16 border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800/80 dark:bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Research Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Topics & Publication Trends
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Distribution of UIUC scholarship across leading research disciplines and recent annual growth.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center rounded-xl bg-white p-1 border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("topics")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "topics"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Key Topics</span>
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "trends"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Annual Trends (5-Year)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Topics Distribution */}
        {activeTab === "topics" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Prominent Research Fields
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Calculated from OpenAlex field classification weights
                  </p>
                </div>
                <span className="text-xs text-slate-400">Click a topic to filter papers</span>
              </div>

              <div className="space-y-4">
                {topics.map((t) => (
                  <div
                    key={t.topicId}
                    onClick={() => onSelectTopic?.(t.displayName)}
                    className="group cursor-pointer rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 font-semibold transition-colors flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        {t.displayName}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {t.count.toLocaleString()} works ({t.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(6, t.percentage * 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topics Insight Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#13294B] to-[#1E3A8A] p-6 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Info className="w-4 h-4" />
                  <span>UIUC Excellence</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">
                  Supercomputing, Quantum & Agriculture
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  The University of Illinois Urbana-Champaign is home to the National
                  Center for Supercomputing Applications (NCSA), birthplace of Mosaic
                  and landmark advances in high-performance parallel computing.
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <span className="font-bold text-white">#1</span> in Parallel Systems & MPI Architecture
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <span className="font-bold text-white">R1</span> Highest Research Activity
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <span className="font-bold text-white">Top 5</span> in Agricultural & Plant Genetics
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-blue-400/20 text-[11px] text-blue-200">
                Data refreshed via OpenAlex Institutional Lineage
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Publication & Citation Trends */}
        {activeTab === "trends" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Works Trend */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Annual Publications (2022 - 2026)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Number of works published per calendar year
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  ~13K / year
                </span>
              </div>

              <div className="flex items-end justify-between h-48 pt-6 pb-2 px-2 gap-3 sm:gap-6 border-b border-slate-200 dark:border-slate-800">
                {trends.map((tr) => {
                  const heightPct = Math.round((tr.count / maxTrendCount) * 100);
                  return (
                    <div key={tr.year} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        {tr.count.toLocaleString()}
                      </span>
                      <div
                        className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-500 transition-all duration-300 group-hover:brightness-110"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {tr.year}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Citations Trend */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Citations by Publication Year
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Accumulated citations by cohort publication year
                  </p>
                </div>
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Total Impact
                </span>
              </div>

              <div className="flex items-end justify-between h-48 pt-6 pb-2 px-2 gap-3 sm:gap-6 border-b border-slate-200 dark:border-slate-800">
                {trends.map((tr) => {
                  const heightPct = Math.round((tr.citedCount / maxCitationCount) * 100);
                  return (
                    <div key={tr.year} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(tr.citedCount / 1000).toFixed(0)}k
                      </span>
                      <div
                        className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-orange-600 to-amber-500 transition-all duration-300 group-hover:brightness-110"
                        style={{ height: `${Math.max(12, heightPct)}%` }}
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {tr.year}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
