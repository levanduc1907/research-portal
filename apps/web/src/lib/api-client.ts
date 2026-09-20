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

export type TeamRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Channel {
  id: string;
  teamId: string;
  name: string;
  topic?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export interface MessageAttachment {
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  attachments?: MessageAttachment[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface TeamNote {
  id: string;
  teamId: string;
  authorId: string;
  title: string;
  content: string;
  color?: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  minEditRole: TeamRole;
  canEdit: boolean;
  userRole: TeamRole;
  lockedByUserId?: string | null;
  lockedByName?: string | null;
  lockedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
}

export interface TeamDocument {
  id: string;
  teamId: string;
  uploaderId: string;
  name: string;
  url: string;
  fileType: string;
  sizeBytes: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  code: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  currentUserRole?: TeamRole;
  members?: TeamMember[];
  channels?: Channel[];
  notes?: TeamNote[];
  documents?: TeamDocument[];
  _count?: {
    notes: number;
    documents: number;
    members: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("chaosnote_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("chaosnote_token", token);
      } else {
        localStorage.removeItem("chaosnote_token");
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("chaosnote_token");
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${res.statusText}`);
    }

    return res.json();
  }

  // Auth
  async devLogin(email: string = "demo@chaosnote.app"): Promise<{ accessToken: string; user: User }> {
    return this.request("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async googleLogin(data: {
    email: string;
    name?: string;
    avatar?: string;
    googleId: string;
  }): Promise<{ accessToken: string; user: User }> {
    return this.request("/auth/google", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Users
  async getMe(): Promise<User> {
    return this.request("/users/me");
  }

  // Personal Notes
  async getNotes(params?: {
    search?: string;
    tag?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    isTrash?: boolean;
  }): Promise<Note[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.tag) searchParams.append("tag", params.tag);
    if (params?.isPinned !== undefined) searchParams.append("isPinned", String(params.isPinned));
    if (params?.isArchived !== undefined) searchParams.append("isArchived", String(params.isArchived));
    if (params?.isTrash !== undefined) searchParams.append("isTrash", String(params.isTrash));

    const qs = searchParams.toString();
    return this.request(`/notes${qs ? `?${qs}` : ""}`);
  }

  async createNote(data: Partial<Note>): Promise<Note> {
    return this.request("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    return this.request(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async restoreNote(id: string): Promise<Note> {
    return this.request(`/notes/${id}/restore`, {
      method: "PATCH",
    });
  }

  async deleteNote(id: string, permanent: boolean = false): Promise<any> {
    return this.request(`/notes/${id}?permanent=${permanent}`, {
      method: "DELETE",
    });
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return this.request("/teams");
  }

  async getTeamById(teamId: string): Promise<Team> {
    return this.request(`/teams/${teamId}`);
  }

  async createTeam(data: { name: string; description?: string; avatar?: string }): Promise<Team> {
    return this.request("/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async joinTeam(code: string): Promise<{ message: string; teamId: string; role: TeamRole }> {
    return this.request("/teams/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<any> {
    return this.request(`/teams/${teamId}/members/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(teamId: string, userId: string): Promise<any> {
    return this.request(`/teams/${teamId}/members/${userId}`, {
      method: "DELETE",
    });
  }

  // Channels & Chat
  async getChannels(teamId: string): Promise<Channel[]> {
    return this.request(`/teams/${teamId}/channels`);
  }

  async createChannel(teamId: string, data: { name: string; topic?: string }): Promise<Channel> {
    return this.request(`/teams/${teamId}/channels`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMessages(channelId: string, limit: number = 50): Promise<Message[]> {
    return this.request(`/channels/${channelId}/messages?limit=${limit}`);
  }

  async postMessage(channelId: string, data: { content: string; attachments?: MessageAttachment[] }): Promise<Message> {
    return this.request(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Team Collaborative Notes (RBAC)
  async getTeamNotes(teamId: string): Promise<TeamNote[]> {
    return this.request(`/teams/${teamId}/notes`);
  }

  async getTeamNoteById(id: string): Promise<TeamNote> {
    return this.request(`/team-notes/${id}`);
  }

  async createTeamNote(teamId: string, data: Partial<TeamNote>): Promise<TeamNote> {
    return this.request(`/teams/${teamId}/notes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTeamNote(id: string, data: Partial<TeamNote>): Promise<TeamNote> {
    return this.request(`/team-notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteTeamNote(id: string): Promise<any> {
    return this.request(`/team-notes/${id}`, {
      method: "DELETE",
    });
  }

  async lockTeamNote(id: string): Promise<any> {
    return this.request(`/team-notes/${id}/lock`, { method: "POST" });
  }

  async unlockTeamNote(id: string): Promise<any> {
    return this.request(`/team-notes/${id}/unlock`, { method: "POST" });
  }

  // Team Documents
  async getTeamDocuments(teamId: string): Promise<TeamDocument[]> {
    return this.request(`/teams/${teamId}/documents`);
  }

  async uploadTeamDocument(teamId: string, data: {
    name: string;
    url: string;
    fileType?: string;
    sizeBytes?: number;
    description?: string;
  }): Promise<TeamDocument> {
    return this.request(`/teams/${teamId}/documents`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteTeamDocument(id: string): Promise<any> {
    return this.request(`/team-documents/${id}`, { method: "DELETE" });
  }

  // Health
  async checkHealth(): Promise<{ status: string; database: string }> {
    return this.request("/health");
  }
}

export const api = new ApiClient();
