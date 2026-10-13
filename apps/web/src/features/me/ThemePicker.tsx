import { Monitor, Moon, Sun } from "lucide-react";
import type { CSSProperties } from "react";
import { useTheme, type ThemeChoice } from "@/lib/theme";

export function ThemePicker() {
  const [theme, setTheme] = useTheme();
  const options: [ThemeChoice, typeof Sun, string][] = [
    ["light", Sun, "Light"],
    ["dark", Moon, "Dark"],
    ["system", Monitor, "Auto"],
  ];
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="label" style={{ paddingInline: 4 }}>Appearance</span>
      <div className="card grid" style={{ "--min": "90px", padding: 10, gridTemplateColumns: "repeat(3, 1fr)" } as CSSProperties}>
        {options.map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className="stack"
            style={{
              alignItems: "center", gap: 4, padding: "12px 0", borderRadius: 14, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: theme === value ? "var(--brand-soft)" : "transparent",
              border: `1px solid ${theme === value ? "var(--brand)" : "var(--border)"}`,
              color: theme === value ? "var(--brand)" : "var(--text-2)",
            }}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
