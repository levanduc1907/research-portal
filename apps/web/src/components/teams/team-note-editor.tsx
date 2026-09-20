"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Lock,
  Unlock,
  Pin,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  Tag,
  Palette,
  Eye,
} from "lucide-react";
import { TeamNote, TeamRole, User, api } from "@/lib/api-client";
import { getSocket } from "@/lib/socket";

interface TeamNoteEditorProps {
  note: TeamNote;
  currentUser: User | null;
  onNoteUpdated: (updated: TeamNote) => void;
  onNoteDeleted: (noteId: string) => void;
}

const COLOR_OPTIONS = [
  { label: "Warm Cream", value: "#FAF8F5" },
  { label: "Soft Sage", value: "#E7EFE3" },
  { label: "Muted Slate", value: "#E4EBF0" },
  { label: "Dusty Rose", value: "#FAECE8" },
  { label: "Pale Amber", value: "#FAF3E1" },
];

export const TeamNoteEditor: React.FC<TeamNoteEditorProps> = ({
  note,
  currentUser,
  onNoteUpdated,
  onNoteDeleted,
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color || "#FAF8F5");
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [minEditRole, setMinEditRole] = useState<TeamRole>(note.minEditRole);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeLock, setActiveLock] = useState<{ id: string; name: string } | null>(
    note.lockedByUserId ? { id: note.lockedByUserId, name: note.lockedByName || "Collaborator" } : null
  );

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync state when note prop changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || "#FAF8F5");
    setTags(note.tags || []);
    setIsPinned(note.isPinned);
    setMinEditRole(note.minEditRole);
    setActiveLock(
      note.lockedByUserId ? { id: note.lockedByUserId, name: note.lockedByName || "Collaborator" } : null
    );
  }, [note.id]);

  // Socket listener for live note updates
  useEffect(() => {
    const socket = getSocket();

    const handleRemoteUpdate = (data: any) => {
      if (data.noteId === note.id && data.author?.id !== currentUser?.id) {
        setTitle(data.title);
        setContent(data.content);
      }
    };

    const handleLockUpdate = (data: any) => {
      if (data.noteId === note.id) {
        setActiveLock(data.lockedBy);
      }
    };

    socket.on(`note:${note.id}:updated`, handleRemoteUpdate);
    socket.on(`team:${note.teamId}:note_lock`, handleLockUpdate);

    return () => {
      socket.off(`note:${note.id}:updated`, handleRemoteUpdate);
      socket.off(`team:${note.teamId}:note_lock`, handleLockUpdate);
    };
  }, [note.id, note.teamId, currentUser?.id]);

  // Auto-save logic
  const triggerAutoSave = useCallback(
    (newTitle: string, newContent: string, newColor: string, newTags: string[], newPinned: boolean, newRole: TeamRole) => {
      if (!note.canEdit) return;

      setSaveStatus("saving");

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(async () => {
        try {
          const updated = await api.updateTeamNote(note.id, {
            title: newTitle,
            content: newContent,
            color: newColor,
            tags: newTags,
            isPinned: newPinned,
            minEditRole: newRole,
          });

          setSaveStatus("saved");
          onNoteUpdated(updated);

          // Broadcast live update
          const socket = getSocket();
          socket.emit("note_content_update", {
            noteId: note.id,
            teamId: note.teamId,
            title: newTitle,
            content: newContent,
            author: currentUser,
          });
        } catch (err) {
          console.error("Failed to auto-save note:", err);
          setSaveStatus("unsaved");
        }
      }, 500);
    },
    [note.id, note.canEdit, note.teamId, currentUser, onNoteUpdated]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content, color, tags, isPinned, minEditRole);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val, color, tags, isPinned, minEditRole);
  };

  const handleColorSelect = (c: string) => {
    setColor(c);
    setShowColorPicker(false);
    triggerAutoSave(title, content, c, tags, isPinned, minEditRole);
  };

  const handleTogglePin = () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    triggerAutoSave(title, content, color, tags, nextPin, minEditRole);
  };

  const handleMinRoleChange = (role: TeamRole) => {
    setMinEditRole(role);
    triggerAutoSave(title, content, color, tags, isPinned, role);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().toLowerCase().replace(/^#/, "");
      if (!tags.includes(clean)) {
        const nextTags = [...tags, clean];
        setTags(nextTags);
        setTagInput("");
        triggerAutoSave(title, content, color, nextTags, isPinned, minEditRole);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    triggerAutoSave(title, content, color, nextTags, isPinned, minEditRole);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this collaborative team note?")) return;
    try {
      await api.deleteTeamNote(note.id);
      onNoteDeleted(note.id);
    } catch (err: any) {
      alert(err.message || "Failed to delete note");
    }
  };

  const isLockedByOther = activeLock && activeLock.id !== currentUser?.id;

  return (
    <div
      style={{ backgroundColor: color }}
      className="flex h-full flex-col transition-colors duration-300 dark:bg-slate-900"
    >
      {/* Top Banner if Read-Only / Viewer */}
      {!note.canEdit && (
        <div className="flex items-center justify-between border-b border-amber-200/80 bg-amber-50/90 px-6 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Read-Only Mode:</strong> You have <em>Viewer</em> permissions for this note. Editing is restricted to <strong>{note.minEditRole}</strong> role or higher.
            </span>
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold dark:bg-amber-900/60">
            View Only
          </span>
        </div>
      )}

      {/* Top Banner if actively locked by another user */}
      {isLockedByOther && (
        <div className="flex items-center gap-2 border-b border-indigo-200/80 bg-indigo-50/90 px-6 py-2.5 text-xs text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
          <span>
            <strong>{activeLock?.name}</strong> is currently editing this document.
          </span>
        </div>
      )}

      {/* Editor Header Actions */}
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/50 px-6 py-3 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/50">
        {/* Left: Author & Auto-save status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>By {note.author?.name || "Author"}</span>
            <span>•</span>
            <span>v{note.version}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#6F8863] dark:text-[#A3B899]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Auto-saved
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls (Colors, Pin, RBAC min role, Delete) */}
        <div className="flex items-center gap-2">
          {note.canEdit && (
            <>
              {/* RBAC Min Edit Role Selector */}
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={minEditRole}
                  onChange={(e) => handleMinRoleChange(e.target.value as TeamRole)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Minimum role required to edit this note"
                >
                  <option value="VIEWER">All Members Can Edit</option>
                  <option value="EDITOR">Editors & Admins</option>
                  <option value="ADMIN">Admins & Owner Only</option>
                </select>
              </div>

              {/* Color Picker Button */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  title="Note Background Tint"
                >
                  <Palette className="h-4 w-4" />
                </button>

                {showColorPicker && (
                  <div className="absolute right-0 top-10 z-20 flex gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-800">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => handleColorSelect(c.value)}
                        style={{ backgroundColor: c.value }}
                        className="h-6 w-6 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110"
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Pin Button */}
              <button
                onClick={handleTogglePin}
                className={`rounded-lg p-1.5 transition-colors ${
                  isPinned
                    ? "bg-[#A3B899]/30 text-[#4F6745] dark:bg-[#A3B899]/20 dark:text-[#A3B899]"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                }`}
                title={isPinned ? "Unpin Note" : "Pin Note"}
              >
                <Pin className="h-4 w-4" />
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                title="Delete Note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 flex-col p-8 space-y-4 overflow-y-auto">
        {/* Title Input */}
        <input
          type="text"
          placeholder="Note Title..."
          value={title}
          disabled={!note.canEdit}
          onChange={handleTitleChange}
          className="w-full bg-transparent font-serif text-2xl font-bold tracking-tight text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-80 dark:text-slate-100"
        />

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              #{tag}
              {note.canEdit && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500"
                >
                  ×
                </button>
              )}
            </span>
          ))}

          {note.canEdit && (
            <div className="flex items-center gap-1 text-xs">
              <Tag className="h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="Add tag (Press Enter)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none dark:text-slate-300"
              />
            </div>
          )}
        </div>

        {/* Content Textarea */}
        <textarea
          placeholder={note.canEdit ? "Write note content in Markdown..." : "No content written yet."}
          value={content}
          disabled={!note.canEdit}
          onChange={handleContentChange}
          className="flex-1 w-full resize-none bg-transparent font-sans text-sm leading-relaxed text-slate-700 placeholder-slate-400 focus:outline-none disabled:opacity-80 dark:text-slate-200"
        />
      </div>
    </div>
  );
};
