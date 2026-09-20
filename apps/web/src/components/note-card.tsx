"use client";

import React from "react";
import { Note } from "../lib/api-client";
import { useNotes } from "../context/notes-context";
import { Pin, Tag, Trash2, Archive } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const {
    activeNote,
    setActiveNote,
    togglePin,
    moveToTrash,
    restoreFromTrash,
    deletePermanently,
  } = useNotes();

  const isSelected = activeNote?.id === note.id;

  return (
    <div
      onClick={() => setActiveNote(note)}
      style={{
        backgroundColor: note.color && note.color !== "#ffffff" ? note.color : undefined,
      }}
      className={`group relative p-4 rounded-xl border transition-all cursor-pointer select-none ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.01]"
          : "hover:border-primary/40 hover:shadow-sm bg-card"
      } ${note.isTrash ? "opacity-75" : ""}`}
    >
      {/* Pin button */}
      {!note.isTrash && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePin(note.id, note.isPinned);
          }}
          className={`absolute top-3 right-3 p-1 rounded-md transition-opacity ${
            note.isPinned
              ? "text-orange-500 opacity-100"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          <Pin className={`h-4 w-4 ${note.isPinned ? "fill-orange-500" : ""}`} />
        </button>
      )}

      {/* Title */}
      <h4 className="font-bold text-base text-foreground tracking-tight pr-6 line-clamp-1 mb-1.5">
        {note.title.trim() ? note.title : "Untitled Note"}
      </h4>

      {/* Content Preview */}
      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
        {note.content.trim() ? note.content : "No additional text..."}
      </p>

      {/* Footer Tags & Timestamp */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap gap-1 items-center">
          {note.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-medium"
            >
              #{t}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[10px]">+{note.tags.length - 2}</span>
          )}
        </div>

        <span>
          {new Date(note.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
