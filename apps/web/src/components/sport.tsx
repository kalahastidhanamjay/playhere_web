import { LayoutGrid } from "lucide-react";
import { useSyncExternalStore, type CSSProperties } from "react";
import { SPORTS, sportOf, type Sport, type SportId } from "@/domain/sports";
import { storage } from "@/lib/storage";
import { cx } from "./ui";

// ------------------------------------------------------------------ remembered filter

const listeners = new Set<() => void>();

/** The sport filter used across discovery lists, remembered per browser. "" is every sport. */
export function useSportFilter(): [string, (id: string) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    storage.sport,
  );
  const set = (id: string) => {
    storage.setSport(id);
    listeners.forEach((l) => l());
  };
  return [value, set];
}

// ------------------------------------------------------------------ components

/** Small coloured sport icon, e.g. on cards. */
export function SportIcon({ sport, size = 28 }: { sport: Sport | string | null | undefined; size?: number }) {
  const s = typeof sport === "object" && sport ? sport : sportOf(sport as string);
  const Icon = s.icon;
  return (
    <span
      className="sport-icon"
      title={s.name}
      style={{ width: size, height: size, borderRadius: size * 0.32, background: `linear-gradient(135deg, ${s.colors[0]}, ${s.colors[1]})` }}
    >
      <Icon size={size * 0.56} aria-hidden />
    </span>
  );
}

/** Pill with the sport's icon and name. */
export function SportTag({ sport }: { sport: string | null | undefined }) {
  const s = sportOf(sport);
  const Icon = s.icon;
  return (
    <span className="sport-tag" style={{ "--sport": s.colors[1] } as CSSProperties}>
      <Icon size={13} aria-hidden /> {s.name}
    </span>
  );
}

/** Horizontal filter row: "All sports" plus every sport. */
export function SportFilter({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="chips chips-scroll" role="group" aria-label="Filter by sport">
      <button type="button" className="chip" aria-pressed={!value} onClick={() => onChange("")}>
        <LayoutGrid size={15} aria-hidden /> All sports
      </button>
      {SPORTS.map((s) => {
        const Icon = s.icon;
        return (
          <button key={s.id} type="button" className="chip" aria-pressed={value === s.id} onClick={() => onChange(s.id)} style={{ flex: "none" }}>
            <Icon size={15} aria-hidden /> {s.name}
          </button>
        );
      })}
    </div>
  );
}

/** Grid of sport tiles for forms. Single choice by default; pass `multiple` for a list. */
export function SportGrid({
  value,
  onChange,
  multiple,
  label = "Sport",
}: {
  value: SportId[];
  onChange: (ids: SportId[]) => void;
  multiple?: boolean;
  label?: string;
}) {
  const toggle = (id: SportId) => {
    if (!multiple) return onChange([id]);
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div className="field">
      <span>{label}</span>
      <div className="sport-grid" role={multiple ? "group" : "radiogroup"} aria-label={label}>
        {SPORTS.map((s) => {
          const on = value.includes(s.id);
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={on}
              className={cx("sport-tile", on && "on")}
              style={{ "--a": s.colors[0], "--b": s.colors[1] } as CSSProperties}
              onClick={() => toggle(s.id)}
            >
              <span className="sport-tile-icon"><Icon size={22} aria-hidden /></span>
              <span className="truncate">{s.name}</span>
              {multiple && on && value[0] === s.id && value.length > 1 && <span className="sport-tile-badge">Main</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
