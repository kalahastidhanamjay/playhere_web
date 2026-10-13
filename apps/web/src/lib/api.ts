import { config } from "./config";
import { storage } from "./storage";

export type ErrorKind = "network" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "validation" | "server" | "unknown";

/** The only error type the UI sees. `message` is safe to show to users. */
export class ApiError extends Error {
  constructor(message: string, readonly kind: ErrorKind = "unknown", readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof Error) return new ApiError(error.message);
    return new ApiError("Something went wrong. Please try again.");
  }
}

/** Fired when the refresh token is no longer valid; the session listens and signs out. */
export const SESSION_EXPIRED = "ph:session-expired";

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Send the body as text/plain (e.g. PUT /users/me/name). */
  text?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = storage.refreshToken();
      if (!refreshToken) return false;
      const res = await fetch(`${config.apiUrl}/auth/token/refresh?refreshToken=${encodeURIComponent(refreshToken)}`, {
        method: "POST",
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string; refreshToken?: string };
      storage.saveTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      queueMicrotask(() => (refreshing = null));
    }
  })();
  return refreshing;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(config.apiUrl + path);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function errorFor(status: number, body: unknown): ApiError {
  const serverMessage =
    body && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
      ? (body as { message: string }).message
      : typeof body === "string" && body.length < 200 && !body.includes("<")
        ? body
        : undefined;
  switch (status) {
    case 400:
    case 422:
      return new ApiError(serverMessage ?? "Please check the details and try again.", "validation", status);
    case 401:
      return new ApiError(serverMessage ?? "Please sign in to continue.", "unauthorized", status);
    case 403:
      return new ApiError(serverMessage ?? "You don't have permission to do that.", "forbidden", status);
    case 404:
      return new ApiError(serverMessage ?? "We couldn't find what you were looking for.", "notFound", status);
    case 409:
      return new ApiError(serverMessage ?? "That conflicts with the current state.", "conflict", status);
  }
  if (status >= 500) return new ApiError(serverMessage ?? "Something went wrong on our side. Please try again.", "server", status);
  return new ApiError(serverMessage ?? "Something went wrong. Please try again.", "unknown", status);
}

async function send<T>(method: string, path: string, opts: RequestOptions = {}, retried = false, anonymous = false): Promise<T> {
  const isPublicAuthCall = path.startsWith("/auth/") && !path.startsWith("/auth/account");
  const token = anonymous || isPublicAuthCall ? null : storage.accessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.text) {
      headers["Content-Type"] = "text/plain";
      body = String(opts.body);
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), { method, headers, body });
  } catch {
    throw new ApiError("Can't reach PlayHere right now. Check your connection and try again.", "network");
  }

  if (res.status === 401 && token && !retried) {
    if (await refreshAccessToken()) return send<T>(method, path, opts, true);
    // Session is dead: sign out, then retry anonymously so public pages still load.
    storage.clearTokens();
    window.dispatchEvent(new Event(SESSION_EXPIRED));
    return send<T>(method, path, opts, true, true);
  }

  const raw = await res.text();
  let data: unknown = raw;
  if (raw && (res.headers.get("content-type") ?? "").includes("json")) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (!res.ok) throw errorFor(res.status, data);
  return (raw ? data : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => send<T>("GET", path, { query }),
  post: <T = void>(path: string, body?: unknown, query?: Query) => send<T>("POST", path, { body, query }),
  put: <T = void>(path: string, body?: unknown, opts?: { text?: boolean }) => send<T>("PUT", path, { body, text: opts?.text }),
  patch: <T = void>(path: string, body?: unknown) => send<T>("PATCH", path, { body }),
  del: <T = void>(path: string, query?: Query) => send<T>("DELETE", path, { query }),
};
