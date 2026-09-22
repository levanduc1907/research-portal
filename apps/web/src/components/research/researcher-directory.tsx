"use client";

import React from "react";
import { Users, Search, ExternalLink, Mail, BookOpen, Quote } from "lucide-react";
import { ResearcherDto, PaginatedResult } from "@repo/contracts";

interface ResearcherDirectoryProps {
  researchersResult: PaginatedResult<ResearcherDto>;
  searchQuery: string;
  selectedDepartment: string;
  onSearchChange: (q: string) => void;
  onDepartmentChange: (dept: string) => void;
  onSelectKeyword?: (keyword: string) => void;
  onSelectResearcher?: (researcher: ResearcherDto) => void;
}

export function ResearcherDirectory({
  researchersResult,
  searchQuery,
  selectedDepartment,
  onSearchChange,
  onDepartmentChange,
  onSelectKeyword,
  onSelectResearcher,
}: ResearcherDirectoryProps) {
  const { data: researchers } = researchersResult;

  return (
    <section id="faculty" className="py-16 border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800/80 dark:bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Faculty Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notable UIUC Researchers
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Discover distinguished professors, chair holders, and research directors driving breakthroughs at Illinois.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 mb-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty by name, bio, or research interest..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="lg:col-span-4">
              <select
                value={selectedDepartment}
                onChange={(e) => onDepartmentChange(e.target.value)}
                aria-label="Filter by department"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Crop Sciences">Crop Sciences & Plant Biology</option>
                <option value="Physics">Physics & Astronomy</option>
                <option value="Electrical">Electrical & Computer Engineering</option>
              </select>
            </div>
          </div>
        </div>

        {/* Researcher Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researchers.map((r) => (
            <div
              key={r.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                {/* Header with Initials badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    onClick={() => onSelectResearcher?.(r)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                      {r.name.replace("Dr. ", "").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {r.name}
                      </h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {r.title}
                      </p>
                    </div>
                  </div>

                  {r.profileUrl && (
                    <a
                      href={r.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View university directory profile"
                      className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  {r.department}
                </p>

                {/* Bio */}
                {r.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-4">
                    {r.bio}
                  </p>
                )}

                {/* Metrics */}
                <div className="flex items-center gap-4 py-3 border-y border-slate-100 dark:border-slate-800 text-xs mb-4">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong className="text-slate-900 dark:text-white">{r.worksCount}</strong> works</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Quote className="w-3.5 h-3.5 text-orange-500" />
                    <span><strong className="text-slate-900 dark:text-white">{(r.citedByCount / 1000).toFixed(0)}k</strong> citations</span>
                  </div>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5">
                  {r.keywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => onSelectKeyword?.(kw)}
                      className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 transition-colors"
                    >
                      #{kw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email link & View Details */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {r.email ? (
                  <a
                    href={`mailto:${r.email}`}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{r.email}</span>
                  </a>
                ) : <span />}

                <button
                  onClick={() => onSelectResearcher?.(r)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
