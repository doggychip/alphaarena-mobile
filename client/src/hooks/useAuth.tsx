import { createContext, useContext, ReactNode, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, API_BASE } from "@/lib/queryClient";

type AuthUser = {
  id: number;
  username: string;
  email: string;
  level: number;
  xp: number;
  credits: number;
  streak: number;
  selectedAgentType: string;
  [key: string]: any;
};

type AuthContext = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string, autoRegister?: boolean) => Promise<AuthUser>;
  register: (username: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "alphaarena_auth_user";

function saveAuthUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function loadAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hasAttemptedReauth = useRef(false);

  const { data: authData, isLoading: isQueryLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "same-origin" });
      if (res.status === 401) {
        // Server doesn't recognize us — check localStorage for re-auth
        const cached = loadAuthUser();
        if (cached && !hasAttemptedReauth.current) {
          hasAttemptedReauth.current = true;
          // Try to silently re-login (server may have restarted, MemStorage wiped)
          try {
            const storedPw = localStorage.getItem("alphaarena_auth_pw");
            if (storedPw) {
              const reAuthRes = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                  username: cached.username,
                  password: storedPw,
                  autoRegister: true,
                }),
              });
              if (reAuthRes.ok) {
                const data = await reAuthRes.json();
                saveAuthUser(data.user);
                return { user: data.user };
              }
            }
          } catch {
            // Re-auth failed — clear cached state
          }
          // If re-auth failed, clear stored data
          saveAuthUser(null);
          localStorage.removeItem("alphaarena_auth_pw");
        }
        return { user: null };
      }
      if (!res.ok) throw new Error("Failed to fetch auth");
      const data = await res.json();
      // Keep localStorage in sync
      if (data.user) saveAuthUser(data.user);
      return data;
    },
    staleTime: Infinity,
    retry: false,
  });

  // Determine user — server response takes precedence, fallback to cached
  const serverUser = authData?.user ?? null;
  const cachedUser = loadAuthUser();
  const user = serverUser || (isQueryLoading ? cachedUser : null);

  const loginMutation = useMutation({
    mutationFn: async ({
      username,
      password,
      autoRegister,
    }: {
      username: string;
      password: string;
      autoRegister?: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
        autoRegister,
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (data.user) {
        saveAuthUser(data.user);
        // Store password for re-auth after server restart (MemStorage wipe)
        localStorage.setItem("alphaarena_auth_pw", variables.password);
      }
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({
      username,
      email,
      password,
    }: {
      username: string;
      email: string;
      password: string;
    }) => {
      const res = await apiRequest("POST", "/api/auth/register", {
        username,
        email,
        password,
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (data.user) {
        saveAuthUser(data.user);
        localStorage.setItem("alphaarena_auth_pw", variables.password);
      }
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      saveAuthUser(null);
      localStorage.removeItem("alphaarena_auth_pw");
      localStorage.removeItem("alphaarena_guest");
      queryClient.setQueryData(["/api/auth/me"], { user: null });
      queryClient.clear();
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isQueryLoading && !cachedUser,
        login: async (username, password, autoRegister) => {
          const data = await loginMutation.mutateAsync({ username, password, autoRegister });
          return data.user;
        },
        register: async (username, email, password) => {
          const data = await registerMutation.mutateAsync({ username, email, password });
          return data.user;
        },
        logout: async () => {
          await logoutMutation.mutateAsync();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
