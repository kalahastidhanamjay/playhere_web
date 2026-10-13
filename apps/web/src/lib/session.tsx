import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account, Tokens } from "@/domain/models";
import { api, ApiError, SESSION_EXPIRED } from "./api";
import { storage } from "./storage";

type Status = "loading" | "ready" | "error";

interface SessionValue {
  account: Account | null;
  status: Status;
  error: ApiError | null;
  signIn(email: string, password: string): Promise<void>;
  verifyOtp(email: string, otp: string): Promise<void>;
  confirmEmailChange(newEmail: string, otp: string): Promise<void>;
  updateName(name: string): Promise<void>;
  reload(): Promise<void>;
  signOut(): void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Source of truth for "who is signed in". `account === null` means guest. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<ApiError | null>(null);

  const loadMe = useCallback(async () => {
    if (!storage.accessToken()) {
      setAccount(null);
      setStatus("ready");
      return;
    }
    try {
      setAccount(await api.get<Account>("/users/me"));
      setError(null);
      setStatus("ready");
    } catch (e) {
      const err = ApiError.from(e);
      if (err.kind === "unauthorized" || err.kind === "notFound") {
        storage.clearTokens();
        setAccount(null);
        setStatus("ready");
      } else {
        setError(err);
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    void loadMe();
    const expired = () => {
      setAccount(null);
      queryClient.clear();
    };
    window.addEventListener(SESSION_EXPIRED, expired);
    return () => window.removeEventListener(SESSION_EXPIRED, expired);
  }, [loadMe, queryClient]);

  const adopt = useCallback(
    async (tokens: Tokens) => {
      storage.saveTokens(tokens.accessToken, tokens.refreshToken);
      const me = await api.get<Account>("/users/me");
      setAccount(me);
      setStatus("ready");
      await queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo<SessionValue>(
    () => ({
      account,
      status,
      error,
      signIn: async (email, password) =>
        adopt(await api.post<Tokens>("/auth/login", { phone: email.trim(), password })),
      verifyOtp: async (email, otp) =>
        adopt(await api.post<Tokens>("/auth/otp/verify", undefined, { phone: email.trim(), otp: otp.trim() })),
      confirmEmailChange: async (newEmail, otp) =>
        adopt(await api.post<Tokens>("/auth/account/email/change/verify", { newEmail: newEmail.trim(), otp: otp.trim() })),
      updateName: async (name) => {
        await api.put("/users/me/name", name.trim(), { text: true });
        setAccount((a) => (a ? { ...a, name: name.trim() } : a));
      },
      reload: loadMe,
      signOut: () => {
        storage.clearTokens();
        setAccount(null);
        queryClient.clear();
      },
    }),
    [account, status, error, adopt, loadMe, queryClient],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Current user id, or null for guests. */
export const useUserId = () => useSession().account?.id ?? null;
