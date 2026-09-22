"use client";

import React from "react";
import { X, ExternalLink, Mail, BookOpen, Quote, Award, Tag } from "lucide-react";
import { ResearcherDto } from "@repo/contracts";

interface ResearcherDetailModalProps {
  researcher: ResearcherDto | null;
  onClose: () => void;
  onSelectKeyword?: (kw: string) => void;
}

export function ResearcherDetailModal({
  researcher,
  onClose,
  onSelectKeyword,
}: ResearcherDetailModalProps) {
  if (!researcher) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-2xl shadow-md">
            {researcher.name.replace("Dr. ", "").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {researcher.name}
            </h2>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {researcher.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {researcher.department}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Published Works</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {researcher.worksCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Quote className="w-4 h-4 text-orange-500" />
              <span>Global Citations</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {researcher.citedByCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Biography */}
        {researcher.bio && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Academic Background & Focus
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {researcher.bio}
            </p>
          </div>
        )}

        {/* Research Keywords */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-500" />
            <span>Research Keywords & Themes</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {researcher.keywords.map((kw) => (
              <button
                key={kw}
                onClick={() => {
                  onSelectKeyword?.(kw);
                  onClose();
                }}
                className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                #{kw}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
          {researcher.email ? (
            <a
              href={`mailto:${researcher.email}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{researcher.email}</span>
            </a>
          ) : <span />}

          <div className="flex items-center gap-3">
            {researcher.profileUrl && (
              <a
                href={researcher.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <span>University Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
