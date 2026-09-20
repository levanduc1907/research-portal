"use client";

import React, { useState } from "react";
import {
  Hash,
  FileText,
  FolderOpen,
  Plus,
  QrCode,
  Users,
  Lock,
  Pin,
  Sparkles,
  ChevronDown,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { Team, Channel, TeamNote, User } from "@/lib/api-client";

interface TeamSidebarProps {
  teams: Team[];
  selectedTeam: Team | null; // null represents Personal Workspace
  selectedChannel: Channel | null;
  selectedNote: TeamNote | null;
  activeView: "chat" | "note" | "vault" | "personal";
  currentUser: User | null;
  onSelectTeam: (team: Team | null) => void;
  onSelectChannel: (channel: Channel) => void;
  onSelectNote: (note: TeamNote) => void;
  onSelectVault: () => void;
  onOpenInviteModal: () => void;
  onOpenMembersModal: () => void;
  onCreateTeamNote: () => void;
  onCreateChannel: () => void;
  onCreateTeamModal: () => void;
}

export const TeamSidebar: React.FC<TeamSidebarProps> = ({
  teams,
  selectedTeam,
  selectedChannel,
  selectedNote,
  activeView,
  currentUser,
  onSelectTeam,
  onSelectChannel,
  onSelectNote,
  onSelectVault,
  onOpenInviteModal,
  onOpenMembersModal,
  onCreateTeamNote,
  onCreateChannel,
  onCreateTeamModal,
}) => {
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);

  const channels = selectedTeam?.channels || [];
  const notes = selectedTeam?.notes || [];

  return (
    <div className="flex h-full w-80 shrink-0 border-r border-slate-200/60 bg-white/40 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40">
      {/* 1. Mini Team Icon Strip */}
      <div className="flex w-16 shrink-0 flex-col items-center border-r border-slate-200/50 bg-slate-50/50 py-4 space-y-3 dark:border-slate-800/50 dark:bg-slate-950/50">
        {/* Personal Workspace Button */}
        <button
          onClick={() => onSelectTeam(null)}
          title="Personal Workspace"
          className={`relative flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold transition-all ${
            selectedTeam === null
              ? "bg-[#6F8863] text-white shadow-md shadow-[#6F8863]/20 dark:bg-[#A3B899] dark:text-slate-900"
              : "bg-white text-slate-700 shadow-2xs hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
          }`}
        >
          <UserIcon className="h-5 w-5" />
          {selectedTeam === null && (
            <div className="absolute -left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#6F8863] dark:bg-[#A3B899]" />
          )}
        </button>

        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800" />

        {/* User's Teams List */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-2">
          {teams.map((t) => {
            const isSelected = selectedTeam?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTeam(t)}
                title={t.name}
                className={`relative flex h-11 w-11 items-center justify-center rounded-2xl text-lg transition-all ${
                  isSelected
                    ? "bg-[#778A9B] text-white shadow-md shadow-[#778A9B]/20 dark:bg-[#778A9B] dark:text-white"
                    : "bg-white/90 text-slate-700 shadow-2xs hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
                }`}
              >
                {t.avatar || "🏢"}
                {isSelected && (
                  <div className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#778A9B]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Add / Join Team Button */}
        <button
          onClick={onCreateTeamModal}
          title="Create or Join Team Workspace"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-[#6F8863] hover:text-[#6F8863] dark:border-slate-700 dark:text-slate-400 dark:hover:border-[#A3B899] dark:hover:text-[#A3B899]"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* 2. Team Channels & Notes Hierarchy Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedTeam ? (
          <>
            {/* Team Header Dropdown */}
            <div className="flex items-center justify-between border-b border-slate-200/60 p-4 dark:border-slate-800/60">
              <div className="overflow-hidden">
                <h3 className="truncate font-semibold text-sm text-slate-800 dark:text-slate-100">
                  {selectedTeam.name}
                </h3>
                <span className="inline-block rounded-md bg-[#A3B899]/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#4F6745] dark:text-[#A3B899]">
                  {selectedTeam.code}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenInviteModal}
                  title="Share QR Code & Invite"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <QrCode className="h-4 w-4" />
                </button>
                <button
                  onClick={onOpenMembersModal}
                  title="Team Members & RBAC"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Users className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Channels & Notes Tree */}
            <div className="flex-1 space-y-4 overflow-y-auto p-3">
              {/* Document Vault Quick Link */}
              <button
                onClick={onSelectVault}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  activeView === "vault"
                    ? "bg-[#778A9B]/15 text-[#2D3F50] font-semibold dark:bg-[#778A9B]/25 dark:text-[#E2E8F0]"
                    : "text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-[#778A9B]" />
                  <span>Document Vault</span>
                </div>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {selectedTeam.documents?.length || 0}
                </span>
              </button>

              {/* Channels Section */}
              <div>
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  <button
                    onClick={() => setChannelsExpanded(!channelsExpanded)}
                    className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        channelsExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <span>Channels</span>
                  </button>
                  <button
                    onClick={onCreateChannel}
                    title="Add Channel"
                    className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {channelsExpanded && (
                  <div className="mt-1 space-y-0.5">
                    {channels.map((ch) => {
                      const isActive =
                        activeView === "chat" && selectedChannel?.id === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => onSelectChannel(ch)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                            isActive
                              ? "bg-[#A3B899]/25 text-[#35482F] font-semibold dark:bg-[#A3B899]/20 dark:text-[#A3B899]"
                              : "text-slate-600 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ch.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Collaborative Team Notes Section */}
              <div>
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  <button
                    onClick={() => setNotesExpanded(!notesExpanded)}
                    className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        notesExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <span>Team Notes</span>
                  </button>
                  <button
                    onClick={onCreateTeamNote}
                    title="Create Team Note"
                    className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {notesExpanded && (
                  <div className="mt-1 space-y-0.5">
                    {notes.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-400">
                        No team notes yet. Click + to create one.
                      </p>
                    ) : (
                      notes.map((n) => {
                        const isActive =
                          activeView === "note" && selectedNote?.id === n.id;
                        return (
                          <button
                            key={n.id}
                            onClick={() => onSelectNote(n)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                              isActive
                                ? "bg-[#6F8863]/15 text-[#2E4226] font-semibold dark:bg-[#A3B899]/20 dark:text-[#A3B899]"
                                : "text-slate-600 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {n.title || "Untitled Note"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!n.canEdit && (
                                <span title="Read-only (Viewer)">
                                  <Lock className="h-3 w-3 text-amber-500" />
                                </span>
                              )}
                              {n.isPinned && (
                                <Pin className="h-3 w-3 text-[#6F8863] dark:text-[#A3B899]" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Personal Workspace Mode Sidebar */
          <div className="flex flex-1 flex-col p-4 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6F8863]/20 text-[#3D5234] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  Personal Space
                </h3>
                <p className="text-[11px] text-slate-400">Private personal notes</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-100">
                🚀 ChaosNote Teams Active
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Select or join a team from the left bar to access real-time channels, document vaults, and collaborative notes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
