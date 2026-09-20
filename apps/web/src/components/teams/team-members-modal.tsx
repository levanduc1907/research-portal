"use client";

import React, { useState } from "react";
import { X, Shield, ShieldCheck, Edit3, Eye, UserMinus, Crown } from "lucide-react";
import { Team, TeamMember, TeamRole, api } from "@/lib/api-client";

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  currentUserId: string;
  onMembersUpdated: () => void;
}

export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({
  isOpen,
  onClose,
  team,
  currentUserId,
  onMembersUpdated,
}) => {
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const isCurrentUserOwnerOrAdmin =
    team.currentUserRole === "OWNER" || team.currentUserRole === "ADMIN";

  const handleRoleChange = async (memberUserId: string, newRole: TeamRole) => {
    try {
      setUpdatingUserId(memberUserId);
      setErrorMessage("");
      await api.updateMemberRole(team.id, memberUserId, newRole);
      onMembersUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm("Are you sure you want to remove this member from the team?")) return;
    try {
      setUpdatingUserId(memberUserId);
      setErrorMessage("");
      await api.removeMember(team.id, memberUserId);
      onMembersUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove member");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case "OWNER":
        return <Crown className="h-3.5 w-3.5 text-amber-500" />;
      case "ADMIN":
        return <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />;
      case "EDITOR":
        return <Edit3 className="h-3.5 w-3.5 text-emerald-500" />;
      case "VIEWER":
        return <Eye className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const getRoleBadgeStyle = (role: TeamRole) => {
    switch (role) {
      case "OWNER":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      case "ADMIN":
        return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
      case "EDITOR":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      case "VIEWER":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="glass-panel relative w-full max-w-lg rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#778A9B]/20 text-[#3C4E5E] dark:bg-[#778A9B]/30 dark:text-[#CBD5E1]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Team Members & RBAC
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage roles and collaborative editing permissions
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

        {errorMessage && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {errorMessage}
          </p>
        )}

        {/* Member Roster List */}
        <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {team.members?.map((m: TeamMember) => {
            const isMe = m.userId === currentUserId;
            const isOwner = m.role === "OWNER";

            return (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
              >
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A3B899]/30 text-xs font-bold text-[#3B4E33] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
                    {m.user.name ? m.user.name.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {m.user.name || "Member"}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.user.email}
                    </p>
                  </div>
                </div>

                {/* Role Selector & Actions */}
                <div className="flex items-center gap-2">
                  {isCurrentUserOwnerOrAdmin && !isOwner && !isMe ? (
                    <select
                      value={m.role}
                      disabled={updatingUserId === m.userId}
                      onChange={(e) =>
                        handleRoleChange(m.userId, e.target.value as TeamRole)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-[#A3B899] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer (Read-only)</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeStyle(
                        m.role
                      )}`}
                    >
                      {getRoleIcon(m.role)}
                      {m.role}
                    </span>
                  )}

                  {isCurrentUserOwnerOrAdmin && !isOwner && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      disabled={updatingUserId === m.userId}
                      title="Remove member"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RBAC Legend */}
        <div className="mt-5 rounded-xl border border-slate-200/60 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Role Permissions Overview
          </h4>
          <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div>• <strong className="text-slate-700 dark:text-slate-300">Owner/Admin</strong>: Full access & team management</div>
            <div>• <strong className="text-slate-700 dark:text-slate-300">Editor</strong>: Edit notes, post chat & upload files</div>
            <div>• <strong className="text-slate-700 dark:text-slate-300">Viewer</strong>: Read-only for notes & docs, can chat</div>
          </div>
        </div>
      </div>
    </div>
  );
};
