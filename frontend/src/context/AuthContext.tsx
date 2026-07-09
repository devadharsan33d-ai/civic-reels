import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { api } from "@/src/utils/api";
import { getToken, saveToken, clearToken } from "@/src/utils/token";

export type User = {
  user_id: string;
  email: string;
  name: string;
  username?: string | null;
  country?: string | null;
  state?: string | null;
  slogan?: string | null;
  picture?: string | null;
  onboarded: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
  handleSessionId: (sid: string) => Promise<User | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await api<User>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      await clearToken();
    }
  }, []);

  const handleSessionId = useCallback(async (session_id: string) => {
    const res = await api<{ session_token: string; user: User }>("/auth/session", {
      method: "POST",
      body: { session_id },
      auth: false,
    });
    await saveToken(res.session_token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch {}
    await clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      // web: parse session_id from hash / query first
      if (Platform.OS === "web") {
        try {
          const hash = window.location.hash || "";
          const search = window.location.search || "";
          const m = hash.match(/session_id=([^&]+)/) || search.match(/session_id=([^&]+)/);
          if (m) {
            const sid = decodeURIComponent(m[1]);
            window.history.replaceState(null, "", window.location.pathname);
            await handleSessionId(sid);
            setLoading(false);
            return;
          }
        } catch {}
      } else {
        // mobile cold-start
        try {
          const initial = await Linking.getInitialURL();
          if (initial) {
            const m = initial.match(/session_id=([^&]+)/);
            if (m) {
              await handleSessionId(decodeURIComponent(m[1]));
              setLoading(false);
              return;
            }
          }
        } catch {}
      }
      await refresh();
      setLoading(false);
    })();
  }, [refresh, handleSessionId]);

  return (
    <Ctx.Provider value={{ user, loading, refresh, setUser, handleSessionId, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
