"use client";

import React from "react";
import { useI18n } from "../lib/i18n/context";
import { NoteFilter, useNotes } from "../context/notes-context";
import {
  FileText,
  Pin,
  Archive,
  Trash2,
  Plus,
  Tag,
  Activity,
  Server,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";

interface SidebarProps {
  onOpenSystemStatus: () => void;
}

export function Sidebar({ onOpenSystemStatus }: SidebarProps) {
  const { t } = useI18n();
  const {
    notes,
    filter,
    setFilter,
    selectedTag,
    setSelectedTag,
    createNote,
    allTags,
  } = useNotes();

  const counts = {
    all: notes.filter((n) => !n.isTrash && !n.isArchived).length,
    pinned: notes.filter((n) => n.isPinned && !n.isTrash).length,
    archived: notes.filter((n) => n.isArchived && !n.isTrash).length,
    trash: notes.filter((n) => n.isTrash).length,
  };

  const navItems: { id: NoteFilter; label: string; icon: any; count: number }[] =
    [
      { id: "all", label: t.allNotes, icon: FileText, count: counts.all },
      { id: "pinned", label: t.pinned, icon: Pin, count: counts.pinned },
      {
        id: "archived",
        label: t.archived,
        icon: Archive,
        count: counts.archived,
      },
      { id: "trash", label: t.trash, icon: Trash2, count: counts.trash },
    ];

  return (
    <aside className="w-64 border-r bg-card/50 flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* New Note CTA */}
        <Button
          onClick={() => createNote()}
          className="w-full justify-start gap-2.5 h-11 rounded-xl shadow-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold"
        >
          <Plus className="h-5 w-5" />
          <span>{t.newNote}</span>
        </Button>

        {/* Navigation Categories */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = filter === item.id && !selectedTag;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setFilter(item.id);
                  setSelectedTag(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Tags Section */}
        {allTags.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
              <span>{t.tags}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {allTags.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setSelectedTag(isSelected ? null : tag)
                    }
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer System Status Link */}
      <div className="pt-4 border-t space-y-2">
        <button
          onClick={onOpenSystemStatus}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span>{t.systemStatus}</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </button>
      </div>
    </aside>
  );
}
