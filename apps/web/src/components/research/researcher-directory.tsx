"use client";

import React from "react";
import { Users, Search, ExternalLink, Mail, BookOpen, Quote, Award } from "lucide-react";
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
    <section id="faculty" className="py-14 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A1120]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded bg-[#13294B] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white mb-2 shadow-sm">
              <Users className="w-3.5 h-3.5 text-[#FF5F05]" />
              <span>Illinois Experts & Faculty</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#13294B] dark:text-white font-heading">
              UIUC Faculty Researchers Directory
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Profiles, citation metrics, and scholarly domains of Illinois scholars and chairs.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#132038] mb-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty by name, bio, or research interest..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#FF5F05] focus:outline-none focus:ring-1 focus:ring-[#FF5F05] dark:border-slate-700 dark:bg-[#0A1120] dark:text-white"
              />
            </div>

            <div className="lg:col-span-4">
              <select
                value={selectedDepartment}
                onChange={(e) => onDepartmentChange(e.target.value)}
                aria-label="Filter by department"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#FF5F05] focus:outline-none focus:ring-1 focus:ring-[#FF5F05] dark:border-slate-700 dark:bg-[#0A1120] dark:text-white"
              >
                <option value="">All Academic Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Crop Sciences">Crop Sciences & Plant Biology</option>
                <option value="Physics">Physics & Astronomy</option>
                <option value="Electrical & Computer Engineering">ECE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Faculty Grid */}
        {researchers.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No faculty researchers matched your search criteria
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your query or resetting the department dropdown filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {researchers.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-[#132038] hover:border-[#FF5F05]/50 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    {/* Faculty Avatar */}
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-[#13294B] text-[#FF5F05] font-black text-base shadow-sm border border-white/20">
                      {r.name
                        .replace("Dr. ", "")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        onClick={() => onSelectResearcher?.(r)}
                        className="font-bold text-[#13294B] group-hover:text-[#FF5F05] dark:text-white dark:group-hover:text-[#FF5F05] text-base truncate transition-colors cursor-pointer font-heading"
                      >
                        {r.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#FF5F05] truncate mt-0.5">
                        {r.title || "Professor"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {r.department}
                      </p>
                    </div>
                  </div>

                  {r.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-4">
                      {r.bio}
                    </p>
                  )}

                  {/* Keywords pills */}
                  {r.keywords && r.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {r.keywords.slice(0, 4).map((kw) => (
                        <button
                          key={kw}
                          onClick={() => onSelectKeyword?.(kw)}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-[#FF5F05] hover:text-white transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#FF5F05] dark:hover:text-white"
                        >
                          {kw}
                        </button>
                      ))}
                      {r.keywords.length > 4 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{r.keywords.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                      <BookOpen className="w-3.5 h-3.5 text-[#13294B] dark:text-slate-400" />
                      {r.worksCount} works
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[#FF5F05]">
                      <Quote className="w-3.5 h-3.5 text-[#FF5F05]" />
                      {(r.citedByCount / 1000).toFixed(0)}k cites
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectResearcher?.(r)}
                    className="text-xs font-bold text-[#13294B] dark:text-slate-200 hover:text-[#FF5F05] dark:hover:text-[#FF5F05] transition-colors"
                  >
                    Profile &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
