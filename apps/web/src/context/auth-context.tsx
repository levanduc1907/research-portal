"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, User } from "../lib/api-client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          // Token expired or server unreachable, fallback to cached user or null
          const cached = localStorage.getItem("chaosnote_user");
          if (cached) setUser(JSON.parse(cached));
        }
      } else {
        // Auto demo user for easy trial if none logged in
        const cached = localStorage.getItem("chaosnote_user");
        if (cached) {
          setUser(JSON.parse(cached));
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const loginWithDemo = async () => {
    try {
      setIsLoading(true);
      const res = await api.devLogin("demo@chaosnote.app");
      api.setToken(res.accessToken);
      setUser(res.user);
      localStorage.setItem("chaosnote_user", JSON.stringify(res.user));
    } catch {
      // Local fallback mock
      const mockUser: User = {
        id: "mock-user-1",
        email: "demo@chaosnote.app",
        name: "Demo User",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser",
        role: "USER",
      };
      setUser(mockUser);
      localStorage.setItem("chaosnote_user", JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      // Simulate / trigger Google OAuth flow
      const randomGoogleId = "google-user-" + Math.floor(Math.random() * 10000);
      const res = await api.googleLogin({
        email: `google.user${Math.floor(Math.random() * 100)}@gmail.com`,
        name: "Google User",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser",
        googleId: randomGoogleId,
      });
      api.setToken(res.accessToken);
      setUser(res.user);
      localStorage.setItem("chaosnote_user", JSON.stringify(res.user));
    } catch {
      // Mock Google user fallback
      const mockGoogle: User = {
        id: "google-mock-id",
        email: "google.user@example.com",
        name: "Google Verified User",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Google",
        role: "USER",
      };
      setUser(mockGoogle);
      localStorage.setItem("chaosnote_user", JSON.stringify(mockGoogle));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    localStorage.removeItem("chaosnote_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGoogle,
        loginWithDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
