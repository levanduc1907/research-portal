"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, QrCode, KeyRound, Sparkles, Share2 } from "lucide-react";
import { Team } from "@/lib/api-client";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onJoinSuccess?: (teamId: string) => void;
  onJoinTeam?: (code: string) => Promise<void>;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  isOpen,
  onClose,
  team,
  onJoinTeam,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [activeTab, setActiveTab] = useState<"invite" | "join">(
    team ? "invite" : "join"
  );

  if (!isOpen) return null;

  const inviteCode = team?.code || "CHAOS-9821";
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}?join=${inviteCode}`
    : `https://chaosnote.app?join=${inviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !onJoinTeam) return;

    try {
      setIsJoining(true);
      setJoinError("");
      await onJoinTeam(joinCodeInput.trim().toUpperCase());
      onClose();
    } catch (err: any) {
      setJoinError(err.message || "Failed to join team. Check code and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="glass-panel relative w-full max-w-md rounded-2xl p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A3B899]/30 text-[#4F6745] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {team ? `Invite to ${team.name}` : "Team Access & Invites"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share QR code or enter a 6-digit access code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="mt-4 flex rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/60">
          {team && (
            <button
              onClick={() => setActiveTab("invite")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                activeTab === "invite"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              Share QR & Code
            </button>
          )}
          <button
            onClick={() => setActiveTab("join")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              activeTab === "join"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Enter Join Code
          </button>
        </div>

        {/* Tab Content: Invite & QR */}
        {activeTab === "invite" && team && (
          <div className="mt-5 space-y-4">
            {/* QR Code Canvas Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="rounded-xl bg-white p-3 shadow-inner">
                <QRCodeSVG
                  value={inviteUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#1E293B"
                />
              </div>
              <p className="mt-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                Scan with phone camera or ChaosNote Mobile app
              </p>
            </div>

            {/* Unique Code Block */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Team Access Code
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 font-mono text-base font-bold tracking-widest text-[#4F6745] dark:border-slate-700 dark:bg-slate-800/80 dark:text-[#A3B899]">
                  {inviteCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-xl bg-[#A3B899] px-3.5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#8FA884] dark:bg-[#7D9B71] dark:hover:bg-[#6D8A61]"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCode ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Invite Link */}
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
            >
              <Share2 className="h-3.5 w-3.5" />
              {copiedLink ? "Direct Invite Link Copied!" : "Copy Direct Invite Link"}
            </button>
          </div>
        )}

        {/* Tab Content: Join by Code */}
        {activeTab === "join" && (
          <form onSubmit={handleJoinSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Enter Team Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. CHAOS-9821"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 font-mono text-sm tracking-wider uppercase text-slate-800 placeholder-slate-400 focus:border-[#A3B899] focus:outline-none focus:ring-2 focus:ring-[#A3B899]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            {joinError && (
              <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {joinError}
              </p>
            )}

            <button
              type="submit"
              disabled={isJoining || !joinCodeInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6F8863] py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-[#5E7653] disabled:opacity-50 dark:bg-[#A3B899] dark:text-slate-900 dark:hover:bg-[#8FA884]"
            >
              {isJoining ? "Joining..." : "Join Team Workspace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
