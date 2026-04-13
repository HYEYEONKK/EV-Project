"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  email: string;
  name: string;
  createdAt: string;
}

interface StoredUser {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

interface OTPEntry {
  email: string;
  code: string;
  expiresAt: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  sendOTP: (email: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  isEmailRegistered: (email: string) => boolean;
}

/* ── 단순 해시 (데모용) ─────────────────────────────────────── */
function hashPassword(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

/* ── localStorage 키 ─────────────────────────────────────────── */
const USERS_KEY = "ev_users";
const OTP_KEY = "ev_otps";

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getOTPs(): OTPEntry[] {
  try {
    return JSON.parse(localStorage.getItem(OTP_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveOTPs(otps: OTPEntry[]) {
  localStorage.setItem(OTP_KEY, JSON.stringify(otps));
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
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      isEmailRegistered: (email: string) => {
        const users = getUsers();
        return users.some((u) => u.email.toLowerCase() === email.toLowerCase());
      },

      sendOTP: async (email: string) => {
        // 6자리 OTP 생성
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const otps = getOTPs().filter((o) => o.email !== email);
        otps.push({ email, code, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10분
        saveOTPs(otps);
        // 실제 메일 발송 없이 데모에서는 코드를 반환
        return { success: true, otp: code };
      },

      verifyOTP: async (email: string, otp: string) => {
        const otps = getOTPs();
        const entry = otps.find((o) => o.email === email && o.code === otp);
        if (!entry) return { success: false, error: "인증 코드가 올바르지 않습니다." };
        if (Date.now() > entry.expiresAt) return { success: false, error: "인증 코드가 만료되었습니다." };
        return { success: true };
      },

      register: async (email: string, password: string, name: string) => {
        const users = getUsers();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          return { success: false, error: "이미 가입된 이메일입니다." };
        }
        const newUser: StoredUser = {
          email,
          name,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
        };
        users.push(newUser);
        saveUsers(users);
        const user: User = { email, name, createdAt: newUser.createdAt };
        set({ user, isAuthenticated: true });
        setCookie("ev_auth", "1", 4);
        return { success: true };
      },

      login: async (email: string, password: string) => {
        const users = getUsers();
        const found = users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hashPassword(password)
        );
        if (!found) return { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
        const user: User = { email: found.email, name: found.name, createdAt: found.createdAt };
        set({ user, isAuthenticated: true });
        setCookie("ev_auth", "1", 4);
        return { success: true };
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
