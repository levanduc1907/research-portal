import { create } from "zustand";
import { authApi, User } from "../services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginWithDemo: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: "demo-mobile-user",
    email: "mobile.demo@chaosnote.app",
    name: "Mobile User",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MobileUser",
    role: "USER",
  },
  token: "demo-token",
  isLoading: false,

  loginWithDemo: async () => {
    try {
      set({ isLoading: true });
      const res = await authApi.devLogin("mobile.demo@chaosnote.app");
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async () => {
    try {
      set({ isLoading: true });
      const res = await authApi.googleLogin({
        email: "google.mobile@chaosnote.app",
        name: "Google Mobile User",
        googleId: "google-mobile-sub-12345",
      });
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  logout: () => {
    set({ user: null, token: null });
  },
}));
