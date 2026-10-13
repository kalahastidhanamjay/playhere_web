import { useEffect, useState } from "react";
import { storage } from "./storage";

export type ThemeChoice = "light" | "dark" | "system";

/** Applies the saved theme to <html data-theme>. "system" removes the attribute so the OS decides. */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(() => storage.theme() ?? "dark");
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return [
    theme,
    (next: ThemeChoice) => {
      storage.setTheme(next);
      setThemeState(next);
    },
  ] as const;
}
