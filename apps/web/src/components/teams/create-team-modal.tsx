"use client";

import React, { useState } from "react";
import { X, Building2, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated: (teamId: string) => void;
}

const AVATAR_EMOJIS = ["🏢", "🚀", "🎨", "⚡", "💡", "🌿", "🔥", "🛡️"];

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onTeamCreated,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("🏢");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);
      setError("");
      const newTeam = await api.createTeam({
        name: name.trim(),
        description: description.trim(),
        avatar,
      });
      setName("");
      setDescription("");
      onTeamCreated(newTeam.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create team workspace");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="glass-panel relative w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6F8863]/20 text-[#3C5234] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Create Team Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collaborate with real-time chat, shared notes, and RBAC
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

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Workspace Icon
            </label>
            <div className="flex gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border text-base transition-all ${
                    avatar === emoji
                      ? "border-[#6F8863] bg-[#A3B899]/30 scale-110 shadow-2xs dark:border-[#A3B899]"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Team / Workspace Name
            </label>
            <input
              type="text"
              placeholder="e.g. Design Studio, Core Engineering..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-800 focus:border-[#A3B899] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Description (Optional)
            </label>
            <textarea
              placeholder="What is this workspace focused on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-800 focus:border-[#A3B899] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="rounded-xl bg-[#6F8863] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5E7653] disabled:opacity-50 dark:bg-[#A3B899] dark:text-slate-900 dark:hover:bg-[#8FA884]"
            >
              {isLoading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
