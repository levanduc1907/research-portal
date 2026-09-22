"use client";

import React from "react";
import { X, ExternalLink, Quote, Calendar, BookOpen, Layers, Users } from "lucide-react";
import { PaperDto } from "@repo/contracts";

interface PaperDetailModalProps {
  paper: PaperDto | null;
  onClose: () => void;
}

export function PaperDetailModal({ paper, onClose }: PaperDetailModalProps) {
  if (!paper) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
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

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {paper.primaryTopic && (
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {paper.primaryTopic.displayName}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            {paper.publicationYear}
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
            <Quote className="w-3 h-3" />
            <span>{paper.citedByCount} citations</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug mb-4">
          {paper.title}
        </h2>

        {/* Authors */}
        <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Authors & Affiliations</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {paper.authors.map((a) => (
              <span
                key={a.id}
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
              >
                {a.displayName}
                {a.authorPosition === "first" && (
                  <span className="ml-1 text-[10px] text-orange-600 font-bold">(1st)</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Abstract */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
            <span>Abstract</span>
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            {paper.abstract || "No abstract available in OpenAlex metadata for this work."}
          </p>
        </div>

        {/* Related Topics */}
        {paper.topics && paper.topics.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Taxonomy Classifications</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {paper.topics.map((t) => (
                <span
                  key={t.id}
                  className="rounded-lg bg-indigo-50/70 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  {t.displayName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-5 gap-3 dark:border-slate-800">
          <span className="text-xs text-slate-400 font-mono">
            OpenAlex ID: {paper.openalexId.replace("https://openalex.org/", "")}
          </span>

          <div className="flex items-center gap-3">
            {paper.doi && (
              <a
                href={paper.doi.startsWith("http") ? paper.doi : `https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition-colors shadow-sm"
              >
                <span>Read Full Paper (DOI)</span>
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
