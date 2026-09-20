import { create } from "zustand";
import { Note, notesApi } from "../services/api";

type SaveStatus = "saved" | "saving" | "unsaved";

interface NotesState {
  notes: Note[];
  activeNote: Note | null;
  saveStatus: SaveStatus;
  searchQuery: string;
  isDarkMode: boolean;
  setDarkMode: (val: boolean) => void;
  setSearchQuery: (q: string) => void;
  setActiveNote: (note: Note | null) => void;
  fetchNotes: (token?: string) => Promise<void>;
  createNote: (initial?: Partial<Note>, token?: string) => Promise<Note>;
  updateNoteAutoSave: (fields: Partial<Note>, token?: string) => void;
  togglePin: (id: string, token?: string) => Promise<void>;
  deleteNote: (id: string, permanent?: boolean, token?: string) => Promise<void>;
}

let autoSaveTimeout: any = null;

const INITIAL_NOTES: Note[] = [
  {
    id: "m-1",
    title: "ChaosNote Mobile App 📱",
    content:
      "Tự động lưu nội dung ghi chú trong thời gian thực khi bạn nhập. Đồng bộ hóa với NestJS API và xử lý tác vụ nền BullMQ.",
    color: "#FEF08A",
    tags: ["mobile", "sync"],
    isPinned: true,
    isArchived: false,
    isTrash: false,
    userId: "demo-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m-2",
    title: "Kế hoạch tập luyện & Dinh dưỡng 🥗",
    content: "Mục tiêu 2,000 kcal, uống đủ 2.5L nước mỗi ngày và hoàn thành 8,000 bước đi bộ.",
    color: "#BBF7D0",
    tags: ["fitness", "health"],
    isPinned: true,
    isArchived: false,
    isTrash: false,
    userId: "demo-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: INITIAL_NOTES,
  activeNote: INITIAL_NOTES[0],
  saveStatus: "saved",
  searchQuery: "",
  isDarkMode: false,

  setDarkMode: (val) => set({ isDarkMode: val }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveNote: (note) => set({ activeNote: note, saveStatus: "saved" }),

  fetchNotes: async (token) => {
    try {
      const data = await notesApi.getNotes(token);
      if (data && data.length > 0) {
        set({ notes: data });
      }
    } catch {}
  },

  createNote: async (initial, token) => {
    const newNote: Note = {
      id: "note-" + Date.now(),
      title: initial?.title || "",
      content: initial?.content || "",
      color: initial?.color || "#FEF08A",
      tags: initial?.tags || [],
      isPinned: initial?.isPinned || false,
      isArchived: false,
      isTrash: false,
      userId: "demo-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNote: newNote,
      saveStatus: "saved",
    }));

    try {
      const created = await notesApi.createNote(newNote, token);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === newNote.id ? created : n)),
        activeNote: created,
      }));
      return created;
    } catch {
      return newNote;
    }
  },

  updateNoteAutoSave: (fields, token) => {
    const currentActive = get().activeNote;
    if (!currentActive) return;

    set({ saveStatus: "unsaved" });

    const updated: Note = {
      ...currentActive,
      ...fields,
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      activeNote: updated,
      notes: state.notes.map((n) => (n.id === updated.id ? updated : n)),
    }));

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Auto-save debounced after 600ms
    autoSaveTimeout = setTimeout(async () => {
      set({ saveStatus: "saving" });
      try {
        await notesApi.updateNote(updated.id, fields, token);
        set({ saveStatus: "saved" });
      } catch {
        set({ saveStatus: "saved" });
      }
    }, 600);
  },

  togglePin: async (id, token) => {
    set((state) => {
      const updatedNotes = state.notes.map((n) =>
        n.id === id ? { ...n, isPinned: !n.isPinned } : n
      );
      const updatedActive =
        state.activeNote?.id === id
          ? { ...state.activeNote, isPinned: !state.activeNote.isPinned }
          : state.activeNote;
      return { notes: updatedNotes, activeNote: updatedActive };
    });

    try {
      const target = get().notes.find((n) => n.id === id);
      if (target) {
        await notesApi.updateNote(id, { isPinned: target.isPinned }, token);
      }
    } catch {}
  },

  deleteNote: async (id, permanent = false, token) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      activeNote: state.activeNote?.id === id ? null : state.activeNote,
    }));

    try {
      await notesApi.deleteNote(id, permanent, token);
    } catch {}
  },
}));
