/**
 * localStorage access that never throws (private windows and blocked storage return null).
 * Tokens live here for the web client; the API sets no cookies.
 */
const KEYS = {
  access: "ph.access_token",
  refresh: "ph.refresh_token",
  theme: "ph.theme",
  city: "ph.city",
  sport: "ph.sport",
} as const;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the session simply won't persist across reloads.
  }
}

export const storage = {
  accessToken: () => read(KEYS.access),
  refreshToken: () => read(KEYS.refresh),
  saveTokens(access: string, refresh?: string | null) {
    write(KEYS.access, access);
    if (refresh) write(KEYS.refresh, refresh);
  },
  clearTokens() {
    write(KEYS.access, null);
    write(KEYS.refresh, null);
  },
  theme: () => read(KEYS.theme) as "light" | "dark" | "system" | null,
  setTheme: (v: "light" | "dark" | "system") => write(KEYS.theme, v),
  city: () => read(KEYS.city) ?? "",
  setCity: (v: string) => write(KEYS.city, v),
  /** Sport filter for discovery lists; empty means every sport. */
  sport: () => read(KEYS.sport) ?? "",
  setSport: (v: string) => write(KEYS.sport, v || null),
};
