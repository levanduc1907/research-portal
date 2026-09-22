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
    <section id="papers" className="py-16 border-b border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Literature Repository</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explore UIUC Publications
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Filter by topic, year, or citation impact across verified Illinois works.
            </p>
          </div>

          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{papers.length}</span> of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{meta.total}</span> works
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 mb-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, abstract, keywords..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            {/* Topic Filter */}
            <div className="lg:col-span-3">
              <select
                value={selectedTopic}
                onChange={(e) => onTopicChange(e.target.value)}
                aria-label="Filter by research topic"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="">All Topics</option>
                <option value="Parallel Computing">Parallel Computing & Optimization</option>
                <option value="Topic Modeling">Topic Modeling & Natural Language AI</option>
                <option value="Quantum">Semiconductor Quantum Structures</option>
                <option value="Photosynthetic">Photosynthetic Processes</option>
                <option value="Distributed">Distributed Systems & Networks</option>
                <option value="Soybean">Soybean Genetics & Agriculture</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="lg:col-span-2">
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(e.target.value)}
                aria-label="Filter by publication year"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="lg:col-span-2">
              <button
                onClick={() => onSortChange(sortBy === "citations" ? "date" : "citations")}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4 text-orange-500" />
                <span>{sortBy === "citations" ? "Most Cited" : "Latest"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Paper Cards List */}
        {papers.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            <BookOpen className="mx-auto w-12 h-12 text-slate-400 mb-3" />
            <h3 className="font-semibold text-slate-900 dark:text-white">No papers found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search terms or clearing selected filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {papers.map((p) => {
              const isExpanded = expandedId === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Topic & Year Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {p.primaryTopic && (
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {p.primaryTopic.displayName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <Calendar className="w-3 h-3" />
                          {p.publicationYear}
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => onSelectPaper?.(p)}
                        className="text-lg font-bold text-slate-900 dark:text-white leading-snug hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer transition-colors"
                      >
                        {p.title}
                      </h3>

                      {/* Authors */}
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {p.authors.map((a) => a.displayName).join(" • ")}
                      </p>
                    </div>

                    {/* Citations Badge */}
                    <div className="flex items-center gap-3 self-start">
                      <div className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200/60 dark:border-orange-900/60">
                        <Quote className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{p.citedByCount}</span>
                        <span className="text-[10px] text-orange-600/80 dark:text-orange-400">cites</span>
                      </div>
                    </div>
                  </div>

                  {/* Abstract & DOI */}
                  {p.abstract && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p
                        className={`text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {p.abstract}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                        >
                          <span>{isExpanded ? "Show less" : "Read abstract"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onSelectPaper?.(p)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-orange-600 dark:text-slate-300 dark:hover:text-orange-400 transition-colors"
                          >
                            <span>View Details</span>
                          </button>

                          {p.doi && (
                            <a
                              href={p.doi.startsWith("http") ? p.doi : `https://doi.org/${p.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                              <span>Full Article</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800/80 pt-6">
            <button
              disabled={!meta.hasPrevPage}
              onClick={() => onPageChange(meta.page - 1)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              disabled={!meta.hasNextPage}
              onClick={() => onPageChange(meta.page + 1)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
