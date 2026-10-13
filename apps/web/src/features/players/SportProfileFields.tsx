import { Chips, Segmented, Select } from "@/components/forms";
import { SportGrid } from "@/components/sport";
import { bowlingLabel, roleLabel } from "@/domain/cricket";
import { BOWLING_STYLES, PLAYER_ROLES } from "@/domain/models";
import { isCricket, sportOf, type SportId } from "@/domain/sports";

export interface SportProfile {
  sports: SportId[];
  position: string;
  role: string;
  batting: string;
  bowling: string;
}

export const sportProfileFrom = (p: {
  sports?: string[] | null;
  position?: string | null;
  playerRole?: string | null;
  battingStyle?: string | null;
  bowlingStyle?: string | null;
} | null): SportProfile => ({
  sports: (p?.sports?.length ? p.sports : p ? ["CRICKET"] : []).map((s) => sportOf(s).id),
  position: p?.position ?? "",
  role: p?.playerRole ?? "BATSMAN",
  batting: p?.battingStyle ?? "RIGHT_HAND",
  bowling: p?.bowlingStyle ?? "NONE",
});

/** The first sport that is not cricket; its positions are offered. */
export const positionSport = (sports: SportId[]) => sports.map(sportOf).find((s) => s.scoring !== "INNINGS") ?? null;

/** Sports you play (first pick is your main one), then the details that sport needs. */
export function SportProfileFields({ value, onChange, compactBowling }: { value: SportProfile; onChange: (v: SportProfile) => void; compactBowling?: boolean }) {
  const set = (patch: Partial<SportProfile>) => onChange({ ...value, ...patch });
  const plays = value.sports.some((s) => isCricket(s));
  const other = positionSport(value.sports);
  return (
    <>
      <SportGrid multiple label="Sports you play (tap your main one first)" value={value.sports} onChange={(sports) => set({ sports })} />
      {other && (
        <Chips
          label={`${other.name} position`}
          value={value.position}
          onChange={(position) => set({ position })}
          options={other.positions.map((p) => ({ value: p, label: p }))}
        />
      )}
      {plays && (
        <>
          <Chips label="Cricket role" value={value.role} onChange={(role) => set({ role })} options={PLAYER_ROLES.map((r) => ({ value: r as string, label: roleLabel(r) }))} />
          <div className="field">
            <span>Batting</span>
            <Segmented value={value.batting} onChange={(batting) => set({ batting })} options={[{ value: "RIGHT_HAND", label: "Right-handed" }, { value: "LEFT_HAND", label: "Left-handed" }]} />
          </div>
          {compactBowling ? (
            <Select label="Bowling" value={value.bowling} onValue={(bowling) => set({ bowling })} options={BOWLING_STYLES.map((b) => ({ value: b, label: bowlingLabel(b) }))} />
          ) : (
            <Chips label="Bowling" value={value.bowling} onChange={(bowling) => set({ bowling })} options={BOWLING_STYLES.map((b) => ({ value: b as string, label: bowlingLabel(b) }))} />
          )}
        </>
      )}
    </>
  );
}

/** Fields for the player API from the form state. */
export const sportProfileInput = (v: SportProfile) => ({
  sports: v.sports.length ? v.sports : ["CRICKET"],
  position: positionSport(v.sports) ? v.position || null : null,
  playerRole: v.role,
  battingStyle: v.batting,
  bowlingStyle: v.bowling,
});
