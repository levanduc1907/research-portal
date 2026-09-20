"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, Note } from "../lib/api-client";
import { useAuth } from "./auth-context";

export type NoteFilter = "all" | "pinned" | "archived" | "trash";
export type SaveStatus = "saved" | "saving" | "unsaved";

interface NotesContextType {
  notes: Note[];
  activeNote: Note | null;
  setActiveNote: (note: Note | null) => void;
  filter: NoteFilter;
  setFilter: (f: NoteFilter) => void;
  search: string;
  setSearch: (s: string) => void;
  selectedTag: string | null;
  setSelectedTag: (t: string | null) => void;
  saveStatus: SaveStatus;
  allTags: string[];
  createNote: (initial?: Partial<Note>) => Promise<Note>;
  updateActiveNote: (fields: Partial<Note>) => void;
  togglePin: (id: string, isPinned: boolean) => Promise<void>;
  toggleArchive: (id: string, isArchived: boolean) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

const DEFAULT_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Chào mừng đến với ChaosNote 🚀",
    content:
      "ChaosNote hỗ trợ soạn thảo ghi chú với tính năng **Auto-Save tức thì** (tự động lưu sau khi dừng gõ), tích hợp Cronjob định kỳ với BullMQ & Redis, Backend NestJS và ứng dụng Mobile React Native đồng bộ.",
    color: "#fef08a",
    tags: ["welcome", "feature"],
    isPinned: true,
    isArchived: false,
    isTrash: false,
    userId: "demo-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-2",
    title: "Danh sách công việc & Cronjobs ⚙️",
    content:
      "- [x] NestJS Backend với Prisma ORM\n- [x] Worker BullMQ quản lý & xử lý cronjob\n- [x] Web Next.js + shadcn/ui + i18n\n- [x] Mobile React Native với Auto-save",
    color: "#bae6fd",
    tags: ["roadmap", "turborepo"],
    isPinned: true,
    isArchived: false,
    isTrash: false,
    userId: "demo-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-3",
    title: "Ý tưởng tính năng mới 💡",
    content: "Tích hợp AI tóm tắt nội dung ghi chú và tự động gắn thẻ (tags) qua worker queue.",
    color: "#bbf7d0",
    tags: ["ideas"],
    isPinned: false,
    isArchived: false,
    isTrash: false,
    userId: "demo-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeNoteRef = useRef<Note | null>(null);

  // Sync ref with state
  useEffect(() => {
    activeNoteRef.current = activeNote;
  }, [activeNote]);

  // Load notes on mount or user change
  const refreshNotes = useCallback(async () => {
    try {
      const fetched = await api.getNotes();
      if (fetched && fetched.length > 0) {
        setNotes(fetched);
        if (!activeNoteRef.current) {
          setActiveNote(fetched[0] || null);
        }
        return;
      }
    } catch {
      // API offline fallback to localStorage or default notes
    }

    const saved = localStorage.getItem("chaosnote_local_notes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (!activeNoteRef.current && parsed.length > 0) {
          setActiveNote(parsed[0] || null);
        }
        return;
      } catch {}
    }

    setNotes(DEFAULT_NOTES);
    if (!activeNoteRef.current) {
      setActiveNote(DEFAULT_NOTES[0] || null);
    }
  }, []);

  useEffect(() => {
    refreshNotes();
  }, [refreshNotes, user]);

  // Save notes locally for offline backup
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("chaosnote_local_notes", JSON.stringify(notes));
    }
  }, [notes]);

  // Create new note
  const createNote = async (initial?: Partial<Note>): Promise<Note> => {
    const newNoteObj: Note = {
      id: "note-" + Date.now(),
      title: initial?.title || "",
      content: initial?.content || "",
      color: initial?.color || "#ffffff",
      tags: initial?.tags || [],
      isPinned: initial?.isPinned || false,
      isArchived: false,
      isTrash: false,
      userId: user?.id || "demo-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const created = await api.createNote(newNoteObj);
      setNotes((prev) => [created, ...prev]);
      setActiveNote(created);
      return created;
    } catch {
      setNotes((prev) => [newNoteObj, ...prev]);
      setActiveNote(newNoteObj);
      return newNoteObj;
    }
  };

  // Debounced Auto-Save
  const updateActiveNote = (fields: Partial<Note>) => {
    if (!activeNoteRef.current) return;

    setSaveStatus("unsaved");

    const updated: Note = {
      ...activeNoteRef.current,
      ...fields,
      updatedAt: new Date().toISOString(),
    };

    setActiveNote(updated);
    setNotes((prev) =>
      prev.map((n) => (n.id === updated.id ? updated : n))
    );

    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Trigger auto-save after 600ms of user inactivity
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await api.updateNote(updated.id, fields);
        setSaveStatus("saved");
      } catch {
        // Saved locally in state & localStorage
        setSaveStatus("saved");
      }
    }, 600);
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !isPinned } : n))
    );
    if (activeNote?.id === id) {
      setActiveNote((prev) => (prev ? { ...prev, isPinned: !isPinned } : null));
    }
    try {
      await api.updateNote(id, { isPinned: !isPinned });
    } catch {}
  };

  const toggleArchive = async (id: string, isArchived: boolean) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isArchived: !isArchived } : n))
    );
    if (activeNote?.id === id) {
      setActiveNote((prev) =>
        prev ? { ...prev, isArchived: !isArchived } : null
      );
    }
    try {
      await api.updateNote(id, { isArchived: !isArchived });
    } catch {}
  };

  const moveToTrash = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isTrash: true } : n))
    );
    if (activeNote?.id === id) {
      const remaining = notes.filter((n) => n.id !== id && !n.isTrash);
      setActiveNote(remaining[0] || null);
    }
    try {
      await api.deleteNote(id, false);
    } catch {}
  };

  const restoreFromTrash = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isTrash: false } : n))
    );
    try {
      await api.restoreNote(id);
    } catch {}
  };

  const deletePermanently = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) {
      const remaining = notes.filter((n) => n.id !== id);
      setActiveNote(remaining[0] || null);
    }
    try {
      await api.deleteNote(id, true);
    } catch {}
  };

  // Compute all unique tags
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags || []).filter(Boolean))
  );

  return (
    <NotesContext.Provider
      value={{
        notes,
        activeNote,
        setActiveNote,
        filter,
        setFilter,
        search,
        setSearch,
        selectedTag,
        setSelectedTag,
        saveStatus,
        allTags,
        createNote,
        updateActiveNote,
        togglePin,
        toggleArchive,
        moveToTrash,
        restoreFromTrash,
        deletePermanently,
        refreshNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}
