"use client";

import React, { useState } from "react";
import { X, Hash } from "lucide-react";
import { api } from "@/lib/api-client";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onChannelCreated: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  teamId,
  onChannelCreated,
}) => {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);
      setError("");
      await api.createChannel(teamId, {
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        topic: topic.trim(),
      });
      setName("");
      setTopic("");
      onChannelCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create channel");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A3B899]/30 text-[#3C5234] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Create Channel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create a dedicated space for team conversations
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                #
              </span>
              <input
                type="text"
                placeholder="e.g. sprint-collab, announcements"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/90 py-2 pl-8 pr-4 text-xs text-slate-800 focus:border-[#A3B899] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Channel Topic (Optional)
            </label>
            <input
              type="text"
              placeholder="What is this channel about?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-800 focus:border-[#A3B899] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
              {isLoading ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
