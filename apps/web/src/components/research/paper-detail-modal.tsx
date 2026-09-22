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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#13294B]/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-[#13294B] bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-700 dark:bg-[#0E1726]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {paper.primaryTopic && (
            <span className="rounded bg-[#13294B]/10 px-2.5 py-1 text-xs font-bold text-[#13294B] dark:bg-white/10 dark:text-white">
              {paper.primaryTopic.displayName}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            {paper.publicationYear}
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-[#FF5F05] bg-orange-50 dark:bg-orange-950/40 px-2.5 py-0.5 rounded border border-orange-200 dark:border-orange-800">
            <Quote className="w-3 h-3" />
            <span>{paper.citedByCount} citations</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#13294B] dark:text-white leading-snug mb-4 font-heading">
          {paper.title}
        </h2>

        {/* Authors */}
        <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-[#13294B] dark:text-slate-300 uppercase tracking-wider mb-2 font-heading">
            <Users className="w-3.5 h-3.5 text-[#FF5F05]" />
            <span>Authors & Institutional Affiliations</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {paper.authors.map((a) => (
              <span
                key={a.id}
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm border border-slate-200 dark:bg-[#0A1120] dark:border-slate-700 dark:text-slate-200"
              >
                {a.displayName}
                {a.authorPosition === "first" && (
                  <span className="ml-1 text-[10px] text-[#FF5F05] font-extrabold">(1st)</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Abstract */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-[#13294B] dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-heading">
            <BookOpen className="w-3.5 h-3.5 text-[#FF5F05]" />
            <span>Abstract</span>
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#132038]">
            {paper.abstract || "No abstract available in OpenAlex metadata for this work."}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            OpenAlex ID: {paper.openalexId.split("/").pop()}
          </div>

          <div className="flex items-center gap-3">
            {(paper.doi || paper.landingPageUrl) && (
              <a
                href={paper.doi || paper.landingPageUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5F05] px-4 py-2 text-xs font-bold text-white hover:bg-[#E84A27] transition-all shadow-md shadow-orange-950/20"
              >
                <span>Read Full Article</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
