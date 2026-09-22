"use client";

import React from "react";
import { ExternalLink, Database, ShieldAlert, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-800/80 dark:bg-slate-950 dark:text-slate-400 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-slate-200 dark:border-slate-800">
          {/* Col 1 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white font-black text-sm">
                I
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                UIUC Research Portal
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              An open-access intelligence system presenting scholarship, active faculty
              profiles, and citation analytics for the University of Illinois Urbana-Champaign.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-orange-500" />
              <span>Data Lineage & Provenance</span>
            </h4>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Publication records and topics are ingested and normalized from the{" "}
              <a
                href="https://openalex.org"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-orange-600 dark:hover:text-orange-400"
              >
                OpenAlex
              </a>{" "}
              scholarly index under CC0 license. Institution ID:{" "}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-[11px] font-mono dark:bg-slate-800">
                I157725225
              </code>
              , ROR ID:{" "}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-[11px] font-mono dark:bg-slate-800">
                047426m28
              </code>
              .
            </p>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Model & Evidence Disclaimer</span>
            </h4>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              AI assistant responses are generated using Retrieval-Augmented Generation (RAG)
              grounded exclusively in verified OpenAlex publications and faculty metadata.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
          <p>
            © {new Date().getFullYear()} University of Illinois Urbana-Champaign Research Portal.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://illinois.edu"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
            >
              <span>illinois.edu</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://siebelschool.illinois.edu"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
            >
              <span>Siebel School of Computing</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
