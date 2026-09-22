"use client";

import React from "react";
import { ExternalLink, Database, ShieldAlert, Heart, MapPin } from "lucide-react";
import { BlockILogo } from "./illinois-logo";

export function Footer() {
  return (
    <footer className="border-t-4 border-t-[#FF5F05] bg-[#13294B] text-slate-200 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-white/15">
          {/* Col 1 */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <BlockILogo className="w-6 h-7.5" withOutline={false} />
              <div>
                <span className="font-extrabold text-sm uppercase tracking-wider text-white font-heading">
                  University of Illinois
                </span>
                <span className="block text-[11px] text-[#FF5F05] font-bold">
                  Urbana-Champaign
                </span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              An open-access intelligence system presenting scholarship, active faculty
              profiles, and citation analytics for the University of Illinois Urbana-Champaign.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#FF5F05]" />
              <span>Champaign-Urbana, Illinois 61820</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 font-heading">
              <Database className="w-3.5 h-3.5 text-[#FF5F05]" />
              <span>Data Lineage & Provenance</span>
            </h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Publication records and topics are ingested and normalized from the{" "}
              <a
                href="https://openalex.org"
                target="_blank"
                rel="noreferrer"
                className="underline text-white hover:text-[#FF5F05]"
              >
                OpenAlex
              </a>{" "}
              scholarly index under CC0 license. Institution ID:{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-[#FF5F05]">
                I157725225
              </code>
              , ROR ID:{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-[#FF5F05]">
                047426m28
              </code>
              .
            </p>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 font-heading">
              <ShieldAlert className="w-3.5 h-3.5 text-[#FF5F05]" />
              <span>Model & Evidence Disclaimer</span>
            </h4>
            <p className="text-xs leading-relaxed text-slate-300">
              AI assistant responses are generated using Retrieval-Augmented Generation (RAG)
              grounded exclusively in verified OpenAlex publications and faculty metadata.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>
            © {new Date().getFullYear()} The Board of Trustees of the University of Illinois. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://illinois.edu"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <span>illinois.edu</span>
              <ExternalLink className="w-3 h-3 text-[#FF5F05]" />
            </a>
            <a
              href="https://siebelschool.illinois.edu"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <span>Siebel School of Computing</span>
              <ExternalLink className="w-3 h-3 text-[#FF5F05]" />
            </a>
            <a
              href="https://experts.illinois.edu"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <span>Illinois Experts</span>
              <ExternalLink className="w-3 h-3 text-[#FF5F05]" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
