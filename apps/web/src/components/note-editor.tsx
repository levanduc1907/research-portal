"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "../lib/i18n/context";
import { useNotes } from "../context/notes-context";
import {
  Pin,
  Archive,
  Trash2,
  Tag,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Palette,
  X,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";

const NOTE_COLORS = [
  { name: "Default", value: "#ffffff" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Blue", value: "#bae6fd" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Orange", value: "#fed7aa" },
];

export function NoteEditor() {
  const { t } = useI18n();
  const {
    activeNote,
    updateActiveNote,
    togglePin,
    toggleArchive,
    moveToTrash,
    restoreFromTrash,
    deletePermanently,
    saveStatus,
  } = useNotes();

  const [tagInput, setTagInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!activeNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/30">
        <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-4 text-2xl shadow-inner">
          📝
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          {t.noNotesFound}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t.createFirstNote}
        </p>
      </div>
    );
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!activeNote.tags.includes(newTag)) {
        updateActiveNote({ tags: [...activeNote.tags, newTag] });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateActiveNote({
      tags: activeNote.tags.filter((t) => t !== tagToRemove),
    });
  };

  return (
    <div
      style={{
        backgroundColor:
          activeNote.color && activeNote.color !== "#ffffff"
            ? activeNote.color
            : undefined,
      }}
      className="flex-1 flex flex-col h-full bg-card relative overflow-hidden transition-colors"
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/50 backdrop-blur-sm gap-3">
        {/* Left: Auto-save status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-background border shadow-xs">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {t.saving}
                </span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {t.saved}
                </span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t.unsaved}</span>
              </>
            )}
          </div>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            {t.lastEdited}: {new Date(activeNote.updatedAt).toLocaleTimeString()}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {activeNote.isTrash ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => restoreFromTrash(activeNote.id)}
                className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t.restoreNote}</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deletePermanently(activeNote.id)}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t.deletePermanently}</span>
              </Button>
            </>
          ) : (
            <>
              {/* Color Palette */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title={t.color}
                  className="h-8 w-8 rounded-lg"
                >
                  <Palette className="h-4 w-4 text-muted-foreground" />
                </Button>

                {showColorPicker && (
                  <div className="absolute right-0 mt-2 p-2 rounded-xl bg-popover border shadow-lg z-50 flex gap-1.5">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          updateActiveNote({ color: c.value });
                          setShowColorPicker(false);
                        }}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                        className={`h-6 w-6 rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-110 ${
                          activeNote.color === c.value ? "ring-2 ring-primary scale-110" : ""
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Pin */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => togglePin(activeNote.id, activeNote.isPinned)}
                title={activeNote.isPinned ? t.unpinNote : t.pinNote}
                className={`h-8 w-8 rounded-lg ${
                  activeNote.isPinned ? "text-orange-500 bg-orange-500/10" : "text-muted-foreground"
                }`}
              >
                <Pin className={`h-4 w-4 ${activeNote.isPinned ? "fill-orange-500" : ""}`} />
              </Button>

              {/* Archive */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleArchive(activeNote.id, activeNote.isArchived)
                }
                title={activeNote.isArchived ? t.unarchiveNote : t.archiveNote}
                className={`h-8 w-8 rounded-lg ${
                  activeNote.isArchived ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground"
                }`}
              >
                <Archive className="h-4 w-4" />
              </Button>

              {/* Trash */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveToTrash(activeNote.id)}
                title={t.moveToTrash}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-4xl w-full mx-auto overflow-y-auto">
        {/* Title Input */}
        <input
          type="text"
          value={activeNote.title}
          onChange={(e) => updateActiveNote({ title: e.target.value })}
          placeholder={t.titlePlaceholder}
          disabled={activeNote.isTrash}
          className="w-full text-2xl sm:text-3xl font-extrabold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 text-foreground mb-4"
        />

        {/* Tags Bar */}
        <div className="flex flex-wrap items-center gap-1.5 mb-6">
          {activeNote.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground group"
            >
              <Tag className="h-3 w-3" />
              <span>{tag}</span>
              {!activeNote.isTrash && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive transition-colors ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {!activeNote.isTrash && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={t.addTag}
              className="h-7 px-2 text-xs bg-transparent border border-dashed rounded-md outline-none text-muted-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          )}
        </div>

        {/* Content Area */}
        <textarea
          value={activeNote.content}
          onChange={(e) => updateActiveNote({ content: e.target.value })}
          placeholder={t.contentPlaceholder}
          disabled={activeNote.isTrash}
          className="flex-1 w-full min-h-[350px] bg-transparent border-none outline-none resize-none text-base leading-relaxed text-foreground placeholder:text-muted-foreground/40 font-normal font-sans"
        />
      </div>
    </div>
  );
}
