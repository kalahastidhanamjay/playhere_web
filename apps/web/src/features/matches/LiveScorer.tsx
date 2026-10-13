import { useQueryClient } from "@tanstack/react-query";
import { Flag, MoreHorizontal, Pause, Play, SkipForward, Timer, Undo2 } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Dialog, useFeedback } from "@/components/overlay";
import { SportIcon } from "@/components/sport";
import { Avatar, Button, Crest, Pill } from "@/components/ui";
import { matchApi } from "@/data/matches";
import { teamApi } from "@/data/teams";
import { away, home, teamById } from "@/domain/cricket";
import {
  eventStyle, isGoalEvent, lineSummary, liveRulesFor, livePeriodLabel, playerLines, readClock, SHOOTOUT_ACTIONS,
  type SportAction,
} from "@/domain/live";
import type { LiveEvent, LiveSide, LiveState, Match, Player, TeamRef } from "@/domain/models";
import { sportOf } from "@/domain/sports";
import { PlayerPickerDialog } from "./Lineup";
import { PeriodTable } from "./PointsScorer";

const EMPTY_SIDE: LiveSide = { onField: [], bench: [], sentOff: [], yellow: [], fouls: {}, fouledOut: [], periodFouls: 0, timeouts: 0, doOrDie: false, all: [] };
const sideOf = (live: LiveState, teamId: string) => live.sides[teamId] ?? EMPTY_SIDE;
/** Players a side has taken off with a substitution (and not brought back). */
const subbedOff = (live: LiveState, teamId: string) => {
  const off = new Set<string>();
  for (const e of live.events) {
    if (e.type !== "SUBSTITUTION" || e.teamId !== teamId) continue;
    if (e.playerId) off.add(e.playerId);
    if (e.relatedPlayerId) off.delete(e.relatedPlayerId);
  }
  return off;
};

/** Re-renders every second while `active`, to move a running clock. */
export function useTick(active: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

type Pick = {
  title: string;
  team: TeamRef;
  players: Player[];
  unavailable: Set<string>;
  skipLabel?: string;
  resolve: (p: Player | "skip" | null) => void;
};

interface Props {
  match: Match;
  live: LiveState;
  squads: Record<string, Player[]>;
  busy: boolean;
  act: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
}

/** The scorer's console for every sport except cricket: clock, per-sport actions with player
 *  pickers, cards and substitutions, extra time and penalties. */
export function LiveScorer({ match, live, squads, busy, act }: Props) {
  const { confirm } = useFeedback();
  const queryClient = useQueryClient();
  const sport = sportOf(match.sportType);
  const rules = liveRulesFor(sport);
  const [pick, setPick] = useState<Pick | null>(null);
  const [raid, setRaid] = useState<{ name: string; resolve: (n: number | null) => void } | null>(null);
  const lines = playerLines(live);
  const id = match.id;

  const h = match.homeScore ?? 0;
  const a = match.awayScore ?? 0;
  const level = h === a;
  const planned = match.plannedPeriods ?? sport.defaultPeriods;
  const shootout = live.phase === "SHOOTOUT";
  const lastRegular = live.period >= planned && live.phase === "REGULAR";
  const lastExtra = live.phase === "EXTRA_TIME" && live.period >= planned + rules.extraPeriods;
  const sets = sport.scoring === "SETS";
  const toWin = Math.floor(planned / 2) + 1;
  const setsDecided = sets && (h >= toWin || a >= toWin);
  const canExtra = !shootout && rules.extraTime && lastRegular && level;
  const canShootout = !shootout && rules.shootout && level && (lastRegular || lastExtra);
  const word = live.phase === "EXTRA_TIME" && rules.extraLabel === "Overtime" ? "overtime" : sport.period.toLowerCase();
  const current = livePeriodLabel(match, live.phase, live.period);
  const next = livePeriodLabel(match, live.phase, live.period + 1);

  const nameOf = (pid: string) => Object.values(squads).flat().find((p) => p.id === pid)?.name ?? "Player";
  const players = (teamId: string, ids: string[]): Player[] =>
    ids.map((pid) => (squads[teamId] ?? []).find((p) => p.id === pid) ?? ({ id: pid, name: nameOf(pid) } as Player));
  /** Players on, or the whole squad when no playing squads were picked. */
  const onField = (teamId: string) => {
    const s = sideOf(live, teamId);
    return s.all.length === 0 ? squads[teamId] ?? [] : players(teamId, s.onField);
  };

  const ask = (p: Omit<Pick, "resolve">) => new Promise<Player | "skip" | null>((resolve) => setPick({ ...p, resolve }));
  const close = (value: Player | "skip" | null) => {
    pick?.resolve(value);
    setPick(null);
  };

  const send = (type: string, teamId: string, playerId?: string, relatedPlayerId?: string, points?: number) =>
    act(() => matchApi.event(id, { type, teamId, playerId, relatedPlayerId, points }));

  const run = async (team: TeamRef, action: SportAction) => {
    const other = team.id === home(match).id ? away(match) : home(match);
    const side = sideOf(live, team.id);
    const out = new Set([...side.sentOff, ...side.fouledOut]);
    const one = async (title: string, list: Player[], unavailable = out, skipLabel?: string, forTeam = team) =>
      ask({ title, team: forTeam, players: list, unavailable, skipLabel });
    switch (action.input) {
      case "none":
        await send(action.type, team.id);
        return;
      case "player": {
        const kick = action.type.startsWith("SHOOTOUT");
        const list = kick
          ? side.all.length ? players(team.id, side.all) : squads[team.id] ?? []
          : [...onField(team.id), ...(action.type.endsWith("_CARD") ? players(team.id, side.bench) : [])];
        const title =
          action.type === "OWN_GOAL" ? `Who scored the own goal? (counts for ${other.name})`
          : kick ? "Who took the kick?"
          : action.type.endsWith("_CARD") ? `Who gets the ${action.label.toLowerCase()} card?`
          : action.type === "FOUL" ? "Who committed the foul?"
          : action.type.includes("TACKLE") ? "Who made the tackle?"
          : `${action.label}: who?`;
        const p = await one(title, list);
        if (p && p !== "skip") await send(action.type, team.id, p.id);
        return;
      }
      case "playerAssist": {
        const scorer = await one("Who scored?", onField(team.id));
        if (!scorer || scorer === "skip") return;
        const assist = await one("Assist by? (optional)", onField(team.id).filter((p) => p.id !== scorer.id), out, "No assist");
        if (assist === null) return;
        await send(action.type, team.id, scorer.id, assist === "skip" ? undefined : assist.id);
        return;
      }
      case "substitution": {
        const off = await one("Player going off", onField(team.id));
        if (!off || off === "skip") return;
        const picked = side.all.length > 0;
        const bench = picked ? [...players(team.id, side.bench), ...players(team.id, [...out])] : (squads[team.id] ?? []).filter((p) => p.id !== off.id);
        // Football has no rolling substitutes: a player taken off stays off.
        const noReturn = sport.id === "FOOTBALL" ? subbedOff(live, team.id) : new Set<string>();
        const on = await one(`Player coming on for ${off.name}`, bench, new Set([...out, ...noReturn, ...(picked ? side.onField : [])]));
        if (on && on !== "skip") await send(action.type, team.id, off.id, on.id);
        return;
      }
      case "raid": {
        const raider = await one(side.doOrDie ? "Do-or-die raid: who is raiding?" : "Who is raiding?", onField(team.id));
        if (!raider || raider === "skip") return;
        const n = await new Promise<number | null>((resolve) => setRaid({ name: raider.name, resolve }));
        if (n === null) return;
        await send(n === 0 ? "EMPTY_RAID" : "RAID_POINTS", team.id, raider.id, undefined, n === 0 ? undefined : n);
        return;
      }
      case "tag": {
        const chaser = await one("Who made the tag?", onField(team.id));
        if (!chaser || chaser === "skip") return;
        const runner = await one("Runner out (optional)", onField(other.id), new Set(), "Skip", other);
        if (runner === null) return;
        await send(action.type, team.id, chaser.id, runner === "skip" ? undefined : runner.id);
      }
    }
  };

  const addPlayer = async (teamId: string, name: string) => {
    const before = new Set((squads[teamId] ?? []).map((p) => p.id));
    const squad = await teamApi.addGuest(teamId, name);
    queryClient.setQueryData(["team", teamId, "squad"], squad);
    const added = squad.find((p) => !before.has(p.id));
    if (added && sideOf(live, teamId).all.length > 0) await matchApi.addPlaying(id, teamId, added.id, true);
    if (added && pick) close(added);
    await queryClient.invalidateQueries({ queryKey: ["match-center", id] });
  };

  const endPeriod = async () => {
    const ok = await confirm({
      title: `End the ${current.toLowerCase()}?`,
      message: sets
        ? "The " + sport.period.toLowerCase() + " goes to the side ahead."
        : `The score stays ${h}–${a}.${rules.clock !== "NONE" ? ` The clock resets for the ${next.toLowerCase()}.` : ""}`,
      confirmLabel: `Start ${next.toLowerCase()}`,
    });
    if (ok) await act(() => matchApi.nextPeriod(id));
  };
  const extraTime = async () => {
    if (await confirm({ title: `Play ${rules.extraLabel.toLowerCase()}?`, message: `Level at ${h}–${a}. The clock resets for ${rules.extraLabel.toLowerCase()}.`, confirmLabel: `Start ${rules.extraLabel.toLowerCase()}` })) {
      await act(() => matchApi.extraTime(id), `${rules.extraLabel} started`);
    }
  };
  const penalties = async () => {
    if (await confirm({ title: "Go to penalties?", message: `Level at ${h}–${a}. Record each kick as scored or missed; the shootout decides the winner.`, confirmLabel: "Start shootout" })) {
      await act(() => matchApi.shootout(id), "Penalty shootout");
    }
  };
  const finish = async () => {
    const ok = await confirm({
      title: "Finish the match?",
      message: shootout
        ? `Penalties ${live.shootoutHome}–${live.shootoutAway} after ${h}–${a}.`
        : sets ? `Finished ${sport.period.toLowerCase()}s decide the result.` : `Final score ${home(match).name} ${h}–${a} ${away(match).name}.${level ? " A level score is a draw." : ""}`,
      confirmLabel: "Finish match",
    });
    if (ok) await act(() => matchApi.complete(id), "Result saved");
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Hero match={match} live={live} busy={busy} onClock={(action) => act(() => matchApi.clock(id, action))} />

      {(shootout || canExtra || canShootout || setsDecided) && (
        <div className="card card-warning stack" style={{ gap: 8 }}>
          <strong>
            {shootout ? `Penalty shootout ${live.shootoutHome}–${live.shootoutAway}` : setsDecided ? `${(h > a ? home(match) : away(match)).name} have won enough ${word}s` : `Level at ${h}–${a}`}
          </strong>
          <span className="small muted">
            {shootout
              ? "Record each kick. Finish when one side is ahead after their kicks."
              : setsDecided ? "Finish to confirm the result."
              : canExtra ? `Play ${rules.extraLabel.toLowerCase()}${rules.shootout ? ", go straight to penalties" : ""}, or finish as a draw.`
              : "Go to penalties or finish as a draw."}
          </span>
          <div className="row wrap">
            {canExtra && <Button icon={Timer} disabled={busy} onClick={extraTime}>{rules.extraLabel}</Button>}
            {canShootout && <Button variant="tonal" disabled={busy} onClick={penalties}>Penalties</Button>}
            {(shootout || setsDecided) && <Button icon={Flag} disabled={busy} onClick={finish}>Finish match</Button>}
          </div>
        </div>
      )}

      <div className="score-pad" aria-busy={busy}>
        {[home(match), away(match)].map((team) => {
          const side = sideOf(live, team.id);
          const actions = shootout ? SHOOTOUT_ACTIONS : rules.actions;
          const kicks = shootout ? live.events.filter((e) => e.phase === "SHOOTOUT" && e.teamId === team.id) : [];
          const yellow = side.yellow.filter((p) => !side.sentOff.includes(p)).length;
          return (
            <div key={team.id} className="score-side">
              <div className="row" style={{ "--gap": "8px" } as CSSProperties}>
                <Crest name={team.name} logo={team.logo} size={30} />
                <strong className="grow truncate">{team.name}</strong>
                {side.doOrDie && <Pill tone="warning">Do-or-die</Pill>}
              </div>
              <div className="row wrap tiny muted" style={{ "--gap": "10px" } as CSSProperties}>
                {side.all.length > 0 && <span>{side.onField.length} on</span>}
                {yellow > 0 && <span>🟨 {yellow}</span>}
                {side.sentOff.length > 0 && <span style={{ color: "var(--live)" }}>🟥 {side.sentOff.length}</span>}
                {sport.id === "BASKETBALL" && (
                  <span style={{ color: side.periodFouls >= 4 ? "var(--warning)" : undefined }}>Team fouls {side.periodFouls}{side.periodFouls >= 4 ? " · bonus" : ""}</span>
                )}
                {side.timeouts > 0 && <span>{side.timeouts} TO</span>}
              </div>
              {kicks.length > 0 && (
                <div className="row wrap" style={{ "--gap": "4px" } as CSSProperties}>
                  {kicks.map((k) => <span key={k.id} title={k.playerName ?? ""}>{k.type === "SHOOTOUT_GOAL" ? "✅" : "❌"}</span>)}
                </div>
              )}
              {actions.filter((x) => x.primary).map((x) => (
                <button
                  key={x.type}
                  type="button"
                  className="score-key"
                  style={{ "--a": x.color ?? sport.colors[0], "--b": x.color ?? sport.colors[1] } as CSSProperties}
                  disabled={busy}
                  onClick={() => void run(team, x)}
                >
                  <x.icon size={18} aria-hidden /> {x.label}
                </button>
              ))}
              <div className="chips" style={{ flexWrap: "wrap" }}>
                {actions.filter((x) => !x.primary).map((x) => (
                  <button key={x.type} type="button" className="chip" disabled={busy} onClick={() => void run(team, x)}>
                    <x.icon size={14} color={x.color} aria-hidden /> {x.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: shootout ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
        <Button variant="secondary" icon={Undo2} disabled={busy || live.events.length === 0} onClick={() => act(() => matchApi.undoPoints(id), "Last event removed")}>Undo</Button>
        {!shootout && (
          <Button variant="secondary" icon={SkipForward} disabled={busy || lastExtra || lastRegular} onClick={endPeriod}>End {word}</Button>
        )}
        <Button variant="secondary" icon={Flag} disabled={busy} onClick={finish}>Finish</Button>
      </div>

      {match.periods && match.periods.length > 0 && <PeriodTable match={match} rows={match.periods} />}
      {live.events.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">Match events</span>
          <LiveTimeline match={match} live={live} limit={12} />
        </div>
      )}
      <LiveLineups match={match} live={live} squads={squads} />
      {!sets && !shootout && (
        <p className="tiny faint" style={{ textAlign: "center" }}>
          {rules.clock !== "NONE"
            ? "Start the clock at kick-off; it keeps running here and for viewers. Pause it for stoppages."
            : `Each point is recorded with the score; ${word}s close automatically.`}
        </p>
      )}

      {pick && (
        <PlayerPickerDialog
          open
          title={pick.title}
          teamName={pick.team.name}
          squad={pick.players}
          unavailable={pick.unavailable}
          reason={(p) =>
            sideOf(live, pick.team.id).sentOff.includes(p.id) ? "Sent off"
            : sideOf(live, pick.team.id).fouledOut.includes(p.id) ? "Fouled out"
            : subbedOff(live, pick.team.id).has(p.id) ? "Subbed off"
            : sideOf(live, pick.team.id).onField.includes(p.id) ? "On the field"
            : "Unavailable"
          }
          figures={(p) => {
            const s = lineSummary(sport, lines.get(p.id));
            const y = sideOf(live, pick.team.id).yellow.includes(p.id) ? " 🟨" : "";
            return s + y;
          }}
          onClose={() => close(null)}
          onPick={(p) => close(p)}
          onAdd={(name) => addPlayer(pick.team.id, name)}
          skipLabel={pick.skipLabel}
          onSkip={() => close("skip")}
        />
      )}
      <Dialog open={!!raid} onClose={() => { raid?.resolve(null); setRaid(null); }} title={raid ? `Raid by ${raid.name}` : undefined}>
        <p className="small muted" style={{ marginTop: -8 }}>Touch points plus bonus. Pick Empty for a raid with no points.</p>
        <div className="row wrap">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} type="button" className="chip" onClick={() => { raid?.resolve(n); setRaid(null); }}>
              {n === 0 ? "Empty" : `+${n}`}
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function Hero({ match, live, busy, onClock }: { match: Match; live: LiveState; busy: boolean; onClock: (a: "start" | "pause") => void }) {
  const sport = sportOf(match.sportType);
  const sets = sport.scoring === "SETS";
  const cur = match.periods?.find((p) => p.period === live.period) ?? { home: 0, away: 0 };
  const h = match.homeScore ?? 0;
  const a = match.awayScore ?? 0;
  const timed = live.clock.direction !== "NONE" && live.phase !== "SHOOTOUT";
  return (
    <div className="card card-hero stack" style={{ padding: 20, gap: 14 }}>
      <div className="row">
        <SportIcon sport={sport} size={30} />
        <strong className="grow truncate">{livePeriodLabel(match, live.phase, live.period)}</strong>
        {live.phase === "EXTRA_TIME" && <Pill tone="warning">{liveRulesFor(sport).extraLabel}</Pill>}
        <Pill tone="live">LIVE</Pill>
      </div>
      <div className="row" style={{ position: "relative", zIndex: 1, alignItems: "center" }}>
        <HeroSide team={home(match)} value={sets ? cur.home : h} />
        <span className="stack" style={{ alignItems: "center", gap: 2 }}>
          <span className="num" style={{ fontSize: 22, opacity: 0.6 }}>–</span>
          {sets && <span className="tiny" style={{ opacity: 0.75, fontWeight: 700 }}>{sport.period}s {h}–{a}</span>}
        </span>
        <HeroSide team={away(match)} value={sets ? cur.away : a} />
      </div>
      {sport.id === "TENNIS" && live.gameLabel && <strong style={{ textAlign: "center" }}>Game {live.gameLabel}</strong>}
      {live.phase === "SHOOTOUT" && <strong style={{ textAlign: "center", fontSize: 20 }}>Penalties {live.shootoutHome}–{live.shootoutAway}</strong>}
      {timed && <ScorerClock match={match} live={live} busy={busy} onClock={onClock} />}
    </div>
  );
}

function ScorerClock({ match, live, busy, onClock }: { match: Match; live: LiveState; busy: boolean; onClock: (a: "start" | "pause") => void }) {
  const c = live.clock;
  useTick(c.running);
  const r = readClock(match, c, live.fetchedAt, live.period);
  return (
    <div className="stack" style={{ alignItems: "center", gap: 6 }}>
      <div className="row" style={{ alignItems: "baseline", "--gap": "8px" } as CSSProperties}>
        <span className="num" style={{ fontSize: 44, lineHeight: 1, color: r.timeUp && c.direction === "DOWN" ? "var(--live)" : undefined }}>{r.main}</span>
        {r.added && <span className="num" style={{ fontSize: 18, color: "var(--warning)" }}>{r.added}</span>}
      </div>
      <span className="small" style={{ opacity: 0.75 }}>
        {r.timeUp
          ? c.direction === "UP" ? `Added time · end the ${sportOf(match.sportType).period.toLowerCase()} when the referee blows` : "Time is up"
          : c.running ? (c.direction === "UP" ? "Clock running" : "Time left") : "Clock paused"}
      </span>
      <Button icon={c.running ? Pause : Play} disabled={busy} onClick={() => onClock(c.running ? "pause" : "start")}>
        {c.running ? "Pause clock" : c.seconds === 0 ? "Start clock" : "Resume clock"}
      </Button>
    </div>
  );
}

function HeroSide({ team, value }: { team: TeamRef; value: number }) {
  return (
    <div className="grow stack" style={{ alignItems: "center", gap: 6, minWidth: 0 }}>
      <span className="truncate" style={{ fontWeight: 700, maxWidth: "100%" }}>{team.name}</span>
      <span className="num" style={{ fontSize: 60, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

/** The running clock for viewers: "47:13 +1:05 · 2nd half". */
export function LiveClockLine({ match, live }: { match: Match; live: LiveState }) {
  const c = live.clock;
  useTick(c.running);
  if (live.phase === "SHOOTOUT") return <strong style={{ textAlign: "center", fontSize: 18 }}>Penalties {live.shootoutHome}–{live.shootoutAway}</strong>;
  if (sportOf(match.sportType).id === "TENNIS" && live.gameLabel) return <strong style={{ textAlign: "center" }}>Game {live.gameLabel}</strong>;
  if (c.direction === "NONE") return null;
  const r = readClock(match, c, live.fetchedAt, live.period);
  return (
    <div className="row" style={{ justifyContent: "center", alignItems: "baseline", "--gap": "8px" } as CSSProperties}>
      {c.running ? <Timer size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
      <span className="num" style={{ fontSize: 22 }}>{r.main}</span>
      {r.added && <span className="num small" style={{ color: "var(--warning)" }}>{r.added}</span>}
      {!c.running && <span className="tiny" style={{ opacity: 0.7 }}>paused</span>}
    </div>
  );
}

/** Under the scoreboard: who scored and when. */
export function GoalScorers({ match, live }: { match: Match; live: LiveState }) {
  const line = (teamId: string) => {
    const by = new Map<string, string[]>();
    for (const e of live.events) {
      if (e.teamId !== teamId || e.phase === "SHOOTOUT" || !(isGoalEvent(e.type) || e.type === "OWN_GOAL")) continue;
      const tag = e.type === "OWN_GOAL" ? " (OG)" : e.type === "GOAL" ? "" : " (P)";
      const key = `${e.playerName ?? "Goal"}${tag}`;
      by.set(key, [...(by.get(key) ?? []), e.time ?? ""]);
    }
    return [...by.entries()].map(([k, times]) => `${k} ${times.filter(Boolean).join(", ")}`.trim());
  };
  const hl = line(home(match).id);
  const al = line(away(match).id);
  if (!hl.length && !al.length) return null;
  return (
    <div className="row row-top small" style={{ opacity: 0.8, "--gap": "12px" } as CSSProperties}>
      <div className="grow stack" style={{ gap: 2, textAlign: "center" }}>{hl.map((l) => <span key={l}>{l}</span>)}</div>
      <MoreHorizontal size={14} aria-hidden style={{ opacity: 0.4, marginTop: 3 }} />
      <div className="grow stack" style={{ gap: 2, textAlign: "center" }}>{al.map((l) => <span key={l}>{l}</span>)}</div>
    </div>
  );
}

/** Match events newest first: "23' ⚽ Ravi (assist Kiran) · Lions". */
export function LiveTimeline({ match, live, limit }: { match: Match; live: LiveState; limit?: number }) {
  const sport = sportOf(match.sportType);
  const rally = live.events.filter((e) => e.type === "POINT").length;
  let events = [...live.events].reverse().filter((e) => e.type !== "POINT");
  if (limit) events = events.slice(0, limit);
  if (!events.length) return <p className="small muted">{rally ? `${rally} points played.` : "Nothing yet."}</p>;
  return (
    <div className="card stack" style={{ padding: "4px 14px", gap: 0 }}>
      {events.map((e, i) => <EventRow key={e.id} match={match} e={e} first={i === 0} period={sport.period} />)}
    </div>
  );
}

function EventRow({ match, e, first, period }: { match: Match; e: LiveEvent; first: boolean; period: string }) {
  const { icon: Icon, color } = eventStyle(e.type);
  // Own goals are credited to the other side; the player belongs to the side that conceded.
  const team = e.type === "OWN_GOAL" ? (e.teamId === home(match).id ? away(match) : home(match)) : teamById(match, e.teamId);
  const who =
    e.type === "SUBSTITUTION" ? `${e.relatedName ?? "Sub"} on · ${e.playerName ?? ""} off`
    : isGoalEvent(e.type) ? `${e.playerName ?? team.name}${e.relatedName ? ` (assist ${e.relatedName})` : ""}`
    : e.type === "OWN_GOAL" ? `${e.playerName ?? team.name} (own goal)`
    : e.type === "TAG" ? `${e.playerName ?? ""}${e.relatedName ? ` tagged ${e.relatedName}` : ""}`
    : e.playerName ?? team.name;
  const label = e.type === "RED_CARD" && e.note === "Second yellow" ? "Second yellow → Red" : e.label;
  return (
    <div className="row" style={{ padding: "10px 0", borderTop: first ? undefined : "1px solid var(--border)", "--gap": "10px" } as CSSProperties}>
      <span className="num small muted" style={{ width: 64, flex: "none" }}>{e.phase === "SHOOTOUT" ? "PEN" : e.time ?? `${period[0]}${e.period}`}</span>
      <Icon size={18} color={color ?? "var(--brand)"} aria-hidden style={{ flex: "none" }} />
      <span className="grow stack" style={{ gap: 0, minWidth: 0 }}>
        <strong className="small truncate">{who}</strong>
        <span className="tiny faint truncate">{label} · {team.name}</span>
      </span>
      {e.points > 0 && <span className="num" style={{ color: "var(--brand)" }}>+{e.points}</span>}
    </div>
  );
}

/** Both sides: on the field, on the bench, sent off, with goals, cards and fouls. */
export function LiveLineups({ match, live, squads }: { match: Match; live: LiveState; squads: Record<string, Player[]> }) {
  const sport = sportOf(match.sportType);
  const lines = playerLines(live);
  const sides = [home(match), away(match)].filter((t) => sideOf(live, t.id).all.length > 0);
  if (!sides.length) return null;
  const nameOf = (id: string) => Object.values(squads).flat().find((p) => p.id === id);
  const row = (id: string, tag?: string, dim?: boolean) => {
    const p = nameOf(id);
    const l = lines.get(id);
    const s = lineSummary(sport, l);
    return (
      <div key={id + (tag ?? "")} className="row" style={{ padding: "5px 0", opacity: dim ? 0.55 : 1, "--gap": "8px" } as CSSProperties}>
        <Avatar name={p?.name ?? "Player"} src={p?.profilePhoto} size={26} />
        <span className="grow truncate small" style={{ fontWeight: 700 }}>{p?.name ?? "Player"}</span>
        {l?.green && <span>🟩</span>}
        {l?.yellow && !l.red && <span>🟨</span>}
        {l?.red && <span>🟥</span>}
        {s && <span className="small" style={{ color: "var(--brand)", fontWeight: 700 }}>{s}</span>}
        {tag && <span className="tiny faint">{tag}</span>}
      </div>
    );
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="label">Lineups</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, alignItems: "start" }}>
        {sides.map((t) => {
          const s = sideOf(live, t.id);
          const off = subbedOff(live, t.id);
          return (
            <div key={t.id} className="card stack" style={{ gap: 0, padding: 12 }}>
              <div className="row" style={{ "--gap": "8px", paddingBottom: 6 } as CSSProperties}>
                <Crest name={t.name} logo={t.logo} size={24} />
                <strong className="grow truncate">{t.name}</strong>
                <span className="tiny faint">{s.onField.length} on field</span>
              </div>
              {s.onField.map((id) => row(id))}
              {s.bench.some((id) => !off.has(id)) && <span className="label" style={{ marginTop: 8 }}>Bench</span>}
              {s.bench.filter((id) => !off.has(id)).map((id) => row(id, undefined, true))}
              {s.bench.filter((id) => off.has(id)).map((id) => row(id, "Subbed off", true))}
              {s.sentOff.map((id) => row(id, "Sent off", true))}
              {s.fouledOut.map((id) => row(id, "Fouled out", true))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
