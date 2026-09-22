"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, PieChart, Info, ArrowUpRight } from "lucide-react";
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
    <section id="analytics" className="py-14 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A1120]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded bg-[#13294B] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white mb-2 shadow-sm">
              <BarChart3 className="w-3.5 h-3.5 text-[#FF5F05]" />
              <span>Research Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#13294B] dark:text-white font-heading">
              Research Focus & Publication Trends
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Distribution of UIUC scholarship across leading research disciplines and recent annual output from OpenAlex.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center rounded-lg bg-white p-1 border border-slate-200 shadow-sm dark:bg-[#132038] dark:border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("topics")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === "topics"
                  ? "bg-[#FF5F05] text-white shadow-sm"
                  : "text-[#13294B] hover:text-[#FF5F05] dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Key Topics</span>
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === "trends"
                  ? "bg-[#FF5F05] text-white shadow-sm"
                  : "text-[#13294B] hover:text-[#FF5F05] dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>5-Year Trends (2022–2026)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Topics Distribution */}
        {activeTab === "topics" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#132038]">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-[#13294B] dark:text-white font-heading">
                    Prominent Research Fields
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Calculated from OpenAlex field classification weights
                  </p>
                </div>
                <span className="text-xs text-[#FF5F05] font-semibold">Click topic to filter</span>
              </div>

              <div className="space-y-3.5">
                {topics.map((t) => (
                  <div
                    key={t.topicId}
                    onClick={() => onSelectTopic?.(t.displayName)}
                    className="group cursor-pointer rounded-lg p-2.5 hover:bg-slate-50 dark:hover:bg-[#1a2b4a] transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-800 dark:text-slate-200 group-hover:text-[#FF5F05] dark:group-hover:text-[#FF5F05] font-bold transition-colors flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F05]" />
                        {t.displayName}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {t.count.toLocaleString()} works ({t.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FF5F05] h-full rounded-full transition-all duration-500 group-hover:bg-[#E84A27]"
                        style={{ width: `${Math.max(6, t.percentage * 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topics Insight Card */}
            <div className="rounded-xl border-t-4 border-t-[#FF5F05] bg-[#13294B] p-6 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#FF5F05] text-xs font-bold uppercase tracking-wider mb-3">
                  <Info className="w-4 h-4" />
                  <span>UIUC Institutional Leadership</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3 font-heading text-white">
                  Pioneering Computing, Quantum & Crop Resilience
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                  The University of Illinois Urbana-Champaign is home to the National
                  Center for Supercomputing Applications (NCSA), birthplace of the modern web
                  (Mosaic) and landmark advances in high-performance parallel computing.
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 border-l-2 border-[#FF5F05] pl-3 py-1">
                    <span className="font-bold text-[#FF5F05]">#1</span>
                    <span>Parallel Systems & High Performance Architecture</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 border-l-2 border-[#FF5F05] pl-3 py-1">
                    <span className="font-bold text-[#FF5F05]">R1</span>
                    <span>Carnegie Highest Research Activity</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 border-l-2 border-[#FF5F05] pl-3 py-1">
                    <span className="font-bold text-[#FF5F05]">Top 5</span>
                    <span>Agricultural & Crop Bioengineering</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Verified OpenAlex Data</span>
                <span className="font-mono text-[#FF5F05]">ROR: 047426m28</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Publication & Citation Trends */}
        {activeTab === "trends" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Works Trend */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#132038]">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-[#13294B] dark:text-white font-heading">
                    Annual Publications (2022 - 2026)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Peer-reviewed articles and proceedings per calendar year
                  </p>
                </div>
                <span className="text-xs font-bold text-[#13294B] dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  ~13K / year
                </span>
              </div>

              <div className="flex items-end justify-between h-52 pt-8 pb-2 px-2 gap-3 sm:gap-6 border-b border-slate-200 dark:border-slate-800">
                {trends.map((tr) => {
                  const heightPct = Math.round((tr.count / maxTrendCount) * 100);
                  return (
                    <div key={tr.year} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <span className="text-[11px] font-bold text-[#13294B] dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                        {tr.count.toLocaleString()}
                      </span>
                      <div
                        className="w-full max-w-[48px] rounded-t-md bg-[#13294B] hover:bg-[#FF5F05] transition-all duration-300"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {tr.year}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Citations Trend */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#132038]">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-[#13294B] dark:text-white font-heading">
                    Citations by Publication Cohort
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Accumulated citations per cohort year
                  </p>
                </div>
                <span className="text-xs font-bold text-[#FF5F05] bg-orange-50 dark:bg-orange-950/40 px-2 py-1 rounded border border-orange-200 dark:border-orange-800">
                  Total Impact
                </span>
              </div>

              <div className="flex items-end justify-between h-52 pt-8 pb-2 px-2 gap-3 sm:gap-6 border-b border-slate-200 dark:border-slate-800">
                {trends.map((tr) => {
                  const heightPct = Math.round((tr.citedCount / maxCitationCount) * 100);
                  return (
                    <div key={tr.year} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <span className="text-[11px] font-bold text-[#FF5F05] opacity-0 group-hover:opacity-100 transition-opacity">
                        {tr.citedCount.toLocaleString()}
                      </span>
                      <div
                        className="w-full max-w-[48px] rounded-t-md bg-[#FF5F05] hover:bg-[#E84A27] transition-all duration-300"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
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
