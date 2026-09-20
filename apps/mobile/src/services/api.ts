import axios from "axios";

export const API_BASE = "http://10.0.2.2:4000"; // Android simulator or localhost

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  isTrash: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  devLogin: async (email: string = "demo@chaosnote.app") => {
    const res = await apiClient.post<{ accessToken: string; user: User }>(
      "/auth/dev-login",
      { email }
    );
    return res.data;
  },
  googleLogin: async (data: {
    email: string;
    name?: string;
    avatar?: string;
    googleId: string;
  }) => {
    const res = await apiClient.post<{ accessToken: string; user: User }>(
      "/auth/google",
      data
    );
    return res.data;
  },
};

export const notesApi = {
  getNotes: async (token?: string) => {
    const res = await apiClient.get<Note[]>("/notes", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },
  createNote: async (data: Partial<Note>, token?: string) => {
    const res = await apiClient.post<Note>("/notes", data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },
  updateNote: async (id: string, data: Partial<Note>, token?: string) => {
    const res = await apiClient.patch<Note>(`/notes/${id}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },
  deleteNote: async (id: string, permanent = false, token?: string) => {
    const res = await apiClient.delete(`/notes/${id}?permanent=${permanent}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },
};
