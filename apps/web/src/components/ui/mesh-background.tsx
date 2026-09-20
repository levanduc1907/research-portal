"use client";

import React from "react";

export const MeshBackground: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#FAF8F5] text-slate-800 antialiased dark:bg-[#090D16] dark:text-slate-100">
      {/* Aurora Mesh Gradient Blurred Blobs (Soft-Skill Palette) */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Blob 1: Soft Sage Green (#A3B899) */}
        <div className="animate-aurora-1 absolute -top-24 -left-20 h-[520px] w-[520px] rounded-full bg-[#A3B899]/40 blur-3xl dark:bg-[#A3B899]/25" />

        {/* Blob 2: Muted Slate (#778A9B) */}
        <div className="animate-aurora-2 absolute top-1/3 -right-28 h-[600px] w-[600px] rounded-full bg-[#778A9B]/35 blur-3xl dark:bg-[#778A9B]/20" />

        {/* Blob 3: Warm Cream / Soft Sand (#EADBCE / #F7F4EF) */}
        <div className="animate-aurora-3 absolute -bottom-32 left-1/4 h-[580px] w-[580px] rounded-full bg-[#EADBCE]/50 blur-3xl dark:bg-[#334155]/25" />

        {/* Blob 4: Delicate Terracotta Accent (#E28D75) */}
        <div className="animate-aurora-1 absolute top-2/3 right-1/3 h-[420px] w-[420px] rounded-full bg-[#E28D75]/25 blur-3xl dark:bg-[#E28D75]/15" />

        {/* Subtle noise grain texture overlay for tactile richness */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.02)_1px,transparent_0)] [background-size:24px_24px] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_0)]" />
      </div>

      {/* Main Content Layer - Full Screen Flex Container */}
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};
