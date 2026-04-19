"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

export interface User {
  email: string;
  name: string;
}

export type UserRole = "samil_admin" | "company_user";

export function deriveRole(email: string): UserRole {
  return email.endsWith("@pwc.com") ? "samil_admin" : "company_user";
}

export function useUserRole(): UserRole | null {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return deriveRole(user.email);
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
}

/* ── 쿠키 헬퍼 (미들웨어 인증용) ─────────────────────────────── */
function setCookie(name: string, value: string, minutes: number) {
  const expires = new Date(Date.now() + minutes * 60_000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict`;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/* ── Zustand 스토어 ──────────────────────────────────────────── */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      register: async (email: string, password: string, name: string) => {
        try {
          const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { success: false, error: data.detail || `서버 오류 (${res.status})` };
          }
          const data = await res.json();
          const user: User = { email: data.email, name: data.name };
          set({ user, isAuthenticated: true });
          setCookie("ev_auth", "1", 1440);
          return { success: true };
        } catch {
          return { success: false, error: "서버에 연결할 수 없습니다." };
        }
      },

      login: async (email: string, password: string) => {
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { success: false, error: data.detail || `서버 오류 (${res.status})` };
          }
          const data = await res.json();
          const user: User = { email: data.email, name: data.name };
          set({ user, isAuthenticated: true });
          setCookie("ev_auth", "1", 1440);
          return { success: true };
        } catch {
          return { success: false, error: "서버에 연결할 수 없습니다." };
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        deleteCookie("ev_auth");
      },
    }),
    {
      name: "ev_auth_state",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
