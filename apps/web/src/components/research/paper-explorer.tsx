"use client";

import React, { useState } from "react";
import {
  Search,
  BookOpen,
  Quote,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  Calendar,
  Sparkles,
} from "lucide-react";
import { PaperDto, PaginatedResult } from "@repo/contracts";

interface PaperExplorerProps {
  papersResult: PaginatedResult<PaperDto>;
  searchQuery: string;
  selectedTopic: string;
  selectedYear: string;
  sortBy: "citations" | "date";
  onSearchChange: (q: string) => void;
  onTopicChange: (topic: string) => void;
  onYearChange: (year: string) => void;
  onSortChange: (sort: "citations" | "date") => void;
  onPageChange: (page: number) => void;
  onSelectPaper?: (paper: PaperDto) => void;
}

export function PaperExplorer({
  papersResult,
  searchQuery,
  selectedTopic,
  selectedYear,
  sortBy,
  onSearchChange,
  onTopicChange,
  onYearChange,
  onSortChange,
  onPageChange,
  onSelectPaper,
}: PaperExplorerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const { data: papers, meta } = papersResult;

  return (
    <section id="papers" className="py-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1726]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded bg-[#FF5F05] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white mb-2 shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Literature Repository</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#13294B] dark:text-white font-heading">
              UIUC Research Papers Catalog
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Query recent publications, topics, authors, and citation impact directly from OpenAlex.
            </p>
          </div>

          {/* Sort toggles */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort By:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 dark:bg-[#132038] dark:border-slate-800">
              <button
                onClick={() => onSortChange("citations")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                  sortBy === "citations"
                    ? "bg-[#13294B] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-[#FF5F05]"
                }`}
              >
                Most Cited
              </button>
              <button
                onClick={() => onSortChange("date")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                  sortBy === "date"
                    ? "bg-[#13294B] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-[#FF5F05]"
                }`}
              >
                Latest (2024-2026)
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#132038]">
          {/* Search input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search paper titles, authors, keywords..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5F05] focus:ring-1 focus:ring-[#FF5F05] dark:border-slate-700 dark:bg-[#0A1120] dark:text-white"
            />
          </div>

          {/* Year selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#FF5F05] focus:ring-1 focus:ring-[#FF5F05] dark:border-slate-700 dark:bg-[#0A1120] dark:text-white"
            >
              <option value="">All Publication Years</option>
              <option value="2026">2026 (Recent)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Topic filter indicator/clear */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-300 dark:border-slate-700 dark:bg-[#0A1120]">
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
              {selectedTopic ? `Topic: ${selectedTopic}` : "All Topics"}
            </span>
            {selectedTopic && (
              <button
                onClick={() => onTopicChange("")}
                className="text-xs text-[#FF5F05] hover:underline font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Papers List */}
        {papers.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No matching research papers found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query, clearing topic filters, or selecting a different publication year.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {papers.map((paper) => {
              const isExpanded = expandedId === paper.id;
              return (
                <article
                  key={paper.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-[#132038] hover:border-[#FF5F05]/50 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Topics and Meta badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        {paper.primaryTopic && (
                          <span className="inline-flex items-center rounded bg-[#13294B]/10 px-2 py-0.5 text-[11px] font-bold text-[#13294B] dark:bg-white/10 dark:text-slate-200">
                            {paper.primaryTopic.displayName}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {paper.publicationYear}
                        </span>
                        {paper.citedByCount > 20 && (
                          <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-[#FF5F05] dark:bg-orange-950/60 dark:text-orange-300">
                            <Quote className="w-3 h-3" />
                            {paper.citedByCount} Citations
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => onSelectPaper?.(paper)}
                        className="text-base sm:text-lg font-bold text-[#13294B] group-hover:text-[#FF5F05] dark:text-white dark:group-hover:text-[#FF5F05] transition-colors leading-snug cursor-pointer font-heading"
                      >
                        {paper.title}
                      </h3>

                      {/* Authors */}
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Authors: </span>
                        {paper.authors && paper.authors.length > 0
                          ? paper.authors.map((a) => a.displayName).join(", ")
                          : "University of Illinois Faculty"}
                      </p>

                      {/* Abstract snippet */}
                      {paper.abstract && (
                        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {isExpanded ? paper.abstract : `${paper.abstract.slice(0, 180)}...`}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      {paper.abstract && (
                        <button
                          onClick={() => toggleExpand(paper.id)}
                          className="text-xs text-slate-500 hover:text-[#13294B] dark:hover:text-white flex items-center gap-1 font-semibold"
                        >
                          {isExpanded ? (
                            <>
                              <span>Less</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>Abstract</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => onSelectPaper?.(paper)}
                        className="rounded-lg bg-[#13294B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#FF5F05] transition-colors shadow-sm"
                      >
                        View Details
                      </button>

                      {(paper.doi || paper.landingPageUrl) && (
                        <a
                          href={paper.doi || paper.landingPageUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#FF5F05] hover:underline font-semibold"
                        >
                          <span>DOI Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing page {meta.page} of {meta.totalPages} ({meta.total.toLocaleString()} total papers)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => onPageChange(meta.page - 1)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="px-3 py-1 rounded bg-[#FF5F05] text-xs font-bold text-white">
                {meta.page}
              </span>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => onPageChange(meta.page + 1)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
