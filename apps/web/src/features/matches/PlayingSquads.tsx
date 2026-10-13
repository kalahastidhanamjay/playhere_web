import { Play, UserPlus } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Avatar, Button, Crest } from "@/components/ui";
import { liveRulesFor, STARTERS } from "@/domain/live";
import type { Match, Player, TeamRef } from "@/domain/models";
import { isCricket, sportOf } from "@/domain/sports";

/** Before kick-off or the toss: tick who plays for each side today (starting or on the bench), or add new players by name. */
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
  onConfirm: (playing: Record<string, string[]>, bench: Record<string, string[]>) => void;
}) {
  const sport = sportOf(match.sportType);
  const cricket = isCricket(match.sportType);
  const withBench = !cricket && liveRulesFor(sport).actions.some((a) => a.type === "SUBSTITUTION");
  const starters = STARTERS[sport.id];
  const sides = [match.homeTeam, match.awayTeam].filter(Boolean) as TeamRef[];
  const initial = (t: TeamRef) => {
    const already = t.id === match.homeTeam?.id ? match.homePlaying : match.awayPlaying;
    return new Set(already?.length ? already : (squads[t.id] ?? []).map((p) => p.id));
  };
  const [picked, setPicked] = useState<Record<string, Set<string>>>(() => Object.fromEntries(sides.map((t) => [t.id, initial(t)])));
  const [bench, setBench] = useState<Record<string, Set<string>>>({});
  const benchOf = (teamId: string) => bench[teamId] ?? new Set<string>();
  const starting = (teamId: string) => [...(picked[teamId] ?? [])].filter((p) => !benchOf(teamId).has(p)).length;
  const setBenched = (teamId: string, id: string, on: boolean) =>
    setBench((cur) => {
      const next = new Set(cur[teamId]);
      if (on) next.add(id);
      else next.delete(id);
      return { ...cur, [teamId]: next };
    });
  const [names, setNames] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const ready = sides.every((t) => (picked[t.id]?.size ?? 0) >= 2 && starting(t.id) >= 1);

  const toggle = (teamId: string, id: string) =>
    setPicked((cur) => {
      const next = new Set(cur[teamId]);
      if (next.has(id)) {
        next.delete(id);
        setBenched(teamId, id, false);
      } else next.add(id);
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
        <p className="muted">
          {cricket
            ? "Tick who is playing today. Only these players appear when you pick batters, bowlers and fielders, and the scorecard lists them all."
            : `Tick who is playing today${withBench ? " and mark substitutes as Bench" : ""}. Only these players appear when you record ${sport.unit}s${withBench ? ", cards and substitutions" : ""}.${starters ? ` A ${sport.name.toLowerCase()} side usually starts ${starters}.` : ""}`}
        </p>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        {sides.map((t) => (
          <div key={t.id} className="card stack" style={{ gap: 6, padding: 12 }}>
            <div className="row" style={{ "--gap": "10px", padding: "4px 6px 8px" } as CSSProperties}>
              <Crest name={t.name} logo={t.logo} size={30} />
              <strong className="grow truncate">{t.name}</strong>
              <span className="small" style={{ color: "var(--brand)", fontWeight: 700 }}>
                {withBench && benchOf(t.id).size > 0 ? `${starting(t.id)} starting · ${benchOf(t.id).size} bench` : `${picked[t.id]?.size ?? 0} playing`}
              </span>
            </div>
            {(squads[t.id] ?? []).map((p) => (
              <label key={p.id} className="lineup-row" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={picked[t.id]?.has(p.id) ?? false} onChange={() => toggle(t.id, p.id)} />
                <Avatar name={p.name} src={p.profilePhoto} size={28} />
                <span className="grow truncate">{p.name}</span>
                {withBench && picked[t.id]?.has(p.id) && (
                  <span className="seg seg-sm" role="group" aria-label={`${p.name}: starting or bench`} onClick={(e) => e.preventDefault()}>
                    <button type="button" aria-selected={!benchOf(t.id).has(p.id)} onClick={() => setBenched(t.id, p.id, false)}>Starting</button>
                    <button type="button" aria-selected={benchOf(t.id).has(p.id)} onClick={() => setBenched(t.id, p.id, true)}>Bench</button>
                  </span>
                )}
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
      {!ready && <p className="small" style={{ color: "var(--warning)" }}>Each side needs at least 2 players, with at least one starting.</p>}
      <Button
        size="lg"
        block
        icon={Play}
        loading={busy}
        disabled={!ready}
        onClick={() =>
          onConfirm(
            Object.fromEntries(Object.entries(picked).map(([k, v]) => [k, [...v].filter((p) => !benchOf(k).has(p))])),
            Object.fromEntries(Object.entries(picked).map(([k, v]) => [k, [...v].filter((p) => benchOf(k).has(p))])),
          )
        }
      >
        {actionLabel}
      </Button>
    </div>
  );
}
