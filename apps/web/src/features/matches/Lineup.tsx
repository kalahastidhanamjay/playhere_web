import { ArrowLeftRight, UserPlus } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Dialog } from "@/components/overlay";
import { Avatar, Button } from "@/components/ui";
import type { BallEvent, Innings, Player } from "@/domain/models";

export type LineupRole = "striker" | "nonStriker" | "bowler";

const LABEL: Record<LineupRole, string> = { striker: "striker", nonStriker: "non-striker", bowler: "bowler" };

const isLegal = (b: BallEvent) => b.extraType !== "WIDE" && b.extraType !== "NO_BALL";
const isOut = (b: BallEvent) => b.wicketType !== "NONE" && b.wicketType !== "RETIRED_HURT";

export function batterFigures(balls: BallEvent[], id: string) {
  let runs = 0;
  let faced = 0;
  for (const b of balls) {
    if (b.batsmanId !== id) continue;
    if (b.extraType !== "WIDE") {
      runs += b.runs;
      faced++;
    }
  }
  return { runs, balls: faced };
}

export function bowlerFigures(balls: BallEvent[], id: string) {
  let legal = 0;
  let runs = 0;
  let wickets = 0;
  for (const b of balls) {
    if (b.bowlerId !== id) continue;
    if (isLegal(b)) legal++;
    runs += b.runs + (b.extraType === "WIDE" || b.extraType === "NO_BALL" ? b.extras : 0);
    if (b.wicketType !== "NONE" && b.wicketType !== "RUN_OUT" && b.wicketType !== "RETIRED_HURT") wickets++;
  }
  return { overs: `${Math.floor(legal / 6)}.${legal % 6}`, runs, wickets };
}

/** Batters who are out: the run-out batter when recorded, otherwise the striker. */
export const dismissed = (balls: BallEvent[]) => new Set(balls.filter(isOut).map((b) => b.outPlayerId ?? b.batsmanId).filter(Boolean) as string[]);

export function missingRole(i: Innings | null): LineupRole | null {
  if (!i) return null;
  if (!i.strikerId) return "striker";
  if (!i.nonStrikerId) return "nonStriker";
  if (!i.bowlerId) return "bowler";
  return null;
}

/** Striker, non-striker and bowler with live figures; empty slots are buttons. */
export function LineupPanel({ innings, balls, nameOf, busy, onPick }: { innings: Innings; balls: BallEvent[]; nameOf: (id: string) => string; busy: boolean; onPick: (r: LineupRole) => void }) {
  const row = (role: LineupRole, id: string | null) => {
    if (!id) {
      return (
        <Button key={role} variant="tonal" block icon={UserPlus} disabled={busy} onClick={() => onPick(role)}>
          Pick the {LABEL[role]}
        </Button>
      );
    }
    const fig = role === "bowler" ? (() => { const f = bowlerFigures(balls, id); return `${f.overs}-${f.runs}-${f.wickets}`; })() : (() => { const f = batterFigures(balls, id); return `${f.runs} (${f.balls})`; })();
    return (
      <button key={role} type="button" className="lineup-row" disabled={busy} onClick={() => onPick(role)} title={`Change ${LABEL[role]}`}>
        <span className="label" style={{ width: 86 }}>{role === "bowler" ? "Bowling" : role === "striker" ? "On strike" : "Non-striker"}</span>
        <strong className="grow truncate" style={{ fontWeight: role === "striker" ? 800 : 600 }}>{nameOf(id)}{role === "striker" ? " *" : ""}</strong>
        <span className="num muted">{fig}</span>
        <ArrowLeftRight size={14} className="faint" aria-hidden />
      </button>
    );
  };
  return (
    <div className="card stack" style={{ padding: 10, gap: 4 }}>
      {row("striker", innings.strikerId)}
      {row("nonStriker", innings.nonStrikerId)}
      <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "4px 0", width: "100%" }} />
      {row("bowler", innings.bowlerId)}
    </div>
  );
}

/** Choose a player from a squad, or add one by name. */
export function PlayerPickerDialog({
  open,
  title,
  teamName,
  squad,
  unavailable,
  reason,
  figures,
  onClose,
  onPick,
  onAdd,
}: {
  open: boolean;
  title: string;
  teamName: string;
  squad: Player[];
  unavailable: Set<string>;
  reason: (p: Player) => string;
  figures: (p: Player) => string;
  onClose: () => void;
  onPick: (p: Player) => void;
  onAdd: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const free = squad.filter((p) => !unavailable.has(p.id));
  const taken = squad.filter((p) => unavailable.has(p.id));
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="faint small" style={{ marginTop: -8 }}>{teamName}</p>
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setAdding(true);
          try {
            await onAdd(name.trim());
            setName("");
          } finally {
            setAdding(false);
          }
        }}
      >
        <input className="input grow" placeholder="Add a player by name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New player name" />
        <Button type="submit" loading={adding} icon={UserPlus}>Add</Button>
      </form>
      <div className="stack" style={{ gap: 4, maxHeight: 360, overflowY: "auto", marginTop: 8 }}>
        {squad.length === 0 && <p className="faint small">No players in {teamName} yet. Add one above.</p>}
        {free.map((p) => (
          <button key={p.id} type="button" className="lineup-row" onClick={() => onPick(p)}>
            <Avatar name={p.name} src={p.profilePhoto} size={32} />
            <strong className="grow truncate">{p.name}</strong>
            <span className="num muted small">{figures(p)}</span>
          </button>
        ))}
        {taken.map((p) => (
          <div key={p.id} className="lineup-row" style={{ opacity: 0.45, cursor: "default" } as CSSProperties}>
            <Avatar name={p.name} src={p.profilePhoto} size={32} />
            <span className="grow truncate">{p.name}</span>
            <span className="small">{reason(p)}</span>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
