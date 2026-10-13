import { Play, UserPlus } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Avatar, Button, Crest } from "@/components/ui";
import type { Match, Player, TeamRef } from "@/domain/models";

/** Before the toss: tick who plays for each side today, or add new players by name. */
export function PlayingSquadsStep({
  match,
  squads,
  busy,
  actionLabel,
  onAdd,
  onConfirm,
}: {
  match: Match;
  squads: Record<string, Player[]>;
  busy: boolean;
  actionLabel: string;
  onAdd: (teamId: string, name: string) => Promise<Player | null>;
  onConfirm: (playing: Record<string, string[]>) => void;
}) {
  const sides = [match.homeTeam, match.awayTeam].filter(Boolean) as TeamRef[];
  const initial = (t: TeamRef) => {
    const already = t.id === match.homeTeam?.id ? match.homePlaying : match.awayPlaying;
    return new Set(already?.length ? already : (squads[t.id] ?? []).map((p) => p.id));
  };
  const [picked, setPicked] = useState<Record<string, Set<string>>>(() => Object.fromEntries(sides.map((t) => [t.id, initial(t)])));
  const [names, setNames] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const ready = sides.every((t) => (picked[t.id]?.size ?? 0) >= 2);

  const toggle = (teamId: string, id: string) =>
    setPicked((cur) => {
      const next = new Set(cur[teamId]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...cur, [teamId]: next };
    });

  const add = async (teamId: string) => {
    const name = (names[teamId] ?? "").trim();
    if (!name) return;
    setAdding(teamId);
    try {
      const p = await onAdd(teamId, name);
      if (p) setPicked((cur) => ({ ...cur, [teamId]: new Set([...(cur[teamId] ?? []), p.id]) }));
      setNames((n) => ({ ...n, [teamId]: "" }));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h2>Playing squads</h2>
        <p className="muted">Tick who is playing today. Only these players appear when you pick batters, bowlers and fielders, and the scorecard lists them all.</p>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        {sides.map((t) => (
          <div key={t.id} className="card stack" style={{ gap: 6, padding: 12 }}>
            <div className="row" style={{ "--gap": "10px", padding: "4px 6px 8px" } as CSSProperties}>
              <Crest name={t.name} logo={t.logo} size={30} />
              <strong className="grow truncate">{t.name}</strong>
              <span className="small" style={{ color: "var(--brand)", fontWeight: 700 }}>{picked[t.id]?.size ?? 0} playing</span>
            </div>
            {(squads[t.id] ?? []).map((p) => (
              <label key={p.id} className="lineup-row" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={picked[t.id]?.has(p.id) ?? false} onChange={() => toggle(t.id, p.id)} />
                <Avatar name={p.name} src={p.profilePhoto} size={28} />
                <span className="grow truncate">{p.name}</span>
              </label>
            ))}
            <form className="row" style={{ marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); void add(t.id); }}>
              <input
                className="input grow"
                placeholder="Add a player by name"
                aria-label={`Add a player to ${t.name}`}
                value={names[t.id] ?? ""}
                onChange={(e) => setNames((n) => ({ ...n, [t.id]: e.target.value }))}
              />
              <Button type="submit" variant="secondary" icon={UserPlus} loading={adding === t.id}>Add</Button>
            </form>
          </div>
        ))}
      </div>
      {!ready && <p className="small" style={{ color: "var(--warning)" }}>Each side needs at least 2 players.</p>}
      <Button
        size="lg"
        block
        icon={Play}
        loading={busy}
        disabled={!ready}
        onClick={() => onConfirm(Object.fromEntries(Object.entries(picked).map(([k, v]) => [k, [...v]])))}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
