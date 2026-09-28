"use client";

import React from "react";
import {
  X,
  ExternalLink,
  Mail,
  BookOpen,
  Quote,
  Award,
  Tag,
} from "lucide-react";
import { ResearcherDto } from "@repo/contracts";
import { getProfileLinkMetadata } from "../../lib/profile-link";

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

  const profileLink = researcher.profileUrl
    ? getProfileLinkMetadata(researcher.profileUrl)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#13294B]/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-[#13294B] bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-700 dark:bg-[#0E1726]"
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

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#13294B] text-[#FF5F05] font-black text-2xl shadow-md border-2 border-white/20 font-heading">
            {researcher.name.replace("Dr. ", "").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#13294B] dark:text-white leading-tight font-heading">
              {researcher.name}
            </h2>
            <p className="text-sm font-bold text-[#FF5F05] mt-0.5">
              {researcher.title || "Professor"}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {researcher.department}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#132038]">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <BookOpen className="w-4 h-4 text-[#13294B] dark:text-white" />
              <span>Published Works</span>
            </div>
            <p className="text-2xl font-black text-[#13294B] dark:text-white font-heading">
              {researcher.worksCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#132038]">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Quote className="w-4 h-4 text-[#FF5F05]" />
              <span>Global Citations</span>
            </div>
            <p className="text-2xl font-black text-[#FF5F05] font-heading">
              {researcher.citedByCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Biography */}
        {researcher.bio && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#13294B] dark:text-slate-300 uppercase tracking-wider mb-2 font-heading">
              Academic Background & Scholarly Focus
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#132038]">
              {researcher.bio}
            </p>
          </div>
        )}

        {/* Research Keywords */}
        {researcher.keywords && researcher.keywords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#13294B] dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-heading">
              <Tag className="w-3.5 h-3.5 text-[#FF5F05]" />
              <span>Specialized Domains & Research Keywords</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {researcher.keywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => {
                    onSelectKeyword?.(kw);
                    onClose();
                  }}
                  className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-[#FF5F05] hover:text-white transition-colors dark:bg-[#132038] dark:text-slate-200 dark:hover:bg-[#FF5F05]"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            {researcher.email ? (
              <a
                href={`mailto:${researcher.email}`}
                className="hover:underline flex items-center gap-1 text-slate-600 dark:text-slate-400"
              >
                <Mail className="w-3.5 h-3.5 text-[#FF5F05]" />
                <span>{researcher.email}</span>
              </a>
            ) : (
              <span>University of Illinois Urbana-Champaign</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {researcher.profileUrl && profileLink && (
              <a
                href={researcher.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5F05] px-4 py-2 text-xs font-bold text-white hover:bg-[#E84A27] transition-all shadow-md shadow-orange-950/20"
              >
                <span>{profileLink.label}</span>
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
