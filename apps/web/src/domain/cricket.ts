import { fmt, parseDate } from "@/lib/format";
import type { Account, BallEvent, Innings, Match, Player, TeamRef } from "./models";
import { isCricket, sportOf } from "./sports";

const TBD: TeamRef = { id: "", name: "TBD", logo: null };

export const home = (m: Match) => m.homeTeam ?? TBD;
export const away = (m: Match) => m.awayTeam ?? TBD;
export const teamById = (m: Match, id: string) => (home(m).id === id ? home(m) : away(m));
export const isFriendly = (m: Match) => !m.tournamentId;
export const canScore = (m: Match, userId: string | null | undefined) => !!userId && userId === (m.scorerId ?? m.organizerId);

export function sortedInnings(m: Match): Innings[] {
  return [...m.innings].sort((a, b) => a.inningsNo - b.inningsNo);
}

export function inningsFor(m: Match, teamId: string): Innings | null {
  const list = sortedInnings(m).filter((i) => i.battingTeamId === teamId);
  return list.length ? list[list.length - 1] : null;
}

export function currentInnings(m: Match): Innings | null {
  const open = sortedInnings(m).filter((i) => !i.completed);
  return open.length ? open[open.length - 1] : null;
}

export const score = (i: Innings) => `${i.runs}/${i.wickets}`;

/** Goals / points / sets for one side of a non-cricket match; null for cricket or before kick-off. */
export function sideScore(m: Match, teamId: string): number | null {
  if (isCricket(m.sportType) || m.status === "SCHEDULED") return null;
  return (teamId === home(m).id ? m.homeScore : m.awayScore) ?? 0;
}

/** "Half 2", "Set 3", "Quarter 4". */
export function periodName(m: Match, period = m.currentPeriod ?? 1): string {
  return `${sportOf(m.sportType).period} ${period}`;
}

/** "2 halves", "Best of 3 games". */
export function formatLabel(m: Match): string {
  const sport = sportOf(m.sportType);
  if (sport.scoring === "INNINGS") return m.oversPerSide ? `${m.oversPerSide} overs` : "";
  const n = m.plannedPeriods ?? sport.defaultPeriods;
  const word = sport.period.toLowerCase();
  return sport.scoring === "SETS" ? `Best of ${n} ${word}s` : `${n} ${word === "half" ? "halves" : `${word}s`}`;
}

function pointsHeadline(m: Match): string {
  const sport = sportOf(m.sportType);
  const h = m.homeScore ?? 0;
  const a = m.awayScore ?? 0;
  const line = `${Math.max(h, a)}–${Math.min(h, a)}`;
  const sets = sport.scoring === "SETS" ? ` (${sport.period.toLowerCase()}s)` : "";
  if (m.status === "COMPLETED") {
    if (!m.winnerTeamId) return sport.scoring === "SETS" ? `Match tied ${h}–${a}` : `Draw ${h}–${a}`;
    return `${teamById(m, m.winnerTeamId).name} won ${line}${sets}`;
  }
  if (m.status === "LIVE") {
    const leader = h === a ? null : h > a ? home(m) : away(m);
    const state = leader ? `${leader.name} lead ${line}${sets}` : `Level ${h}–${a}`;
    if (sport.scoring === "SETS") {
      const cur = m.periods?.find((p) => p.period === m.currentPeriod);
      return `${periodName(m)} · ${cur ? `${cur.home}–${cur.away}` : "0–0"} · ${state}`;
    }
    return `${periodName(m)} · ${state}`;
  }
  if (m.status === "ABANDONED") return "Match abandoned";
  return fmt.matchTime(parseDate(m.matchDate));
}
export const legalBalls = (i: Innings) => fmt.oversToBalls(i.overs);

export function stageLabel(m: Match): string {
  const t = (m.matchType ?? "").toUpperCase();
  if (!t) return "Match";
  if (t === "LEAGUE") return "League";
  if (t === "FRIENDLY") return formatLabel(m) ? `Friendly · ${formatLabel(m)}` : "Friendly";
  if (t.includes("SEMI")) return "Semi-final";
  if (t.includes("QUARTER")) return "Quarter-final";
  if (t.includes("FINAL")) return "Final";
  return fmt.label(t);
}

/** "Tirupati Cup · League", or just "Friendly · 2 halves" for friendlies. */
export const matchContext = (m: Match) => (isFriendly(m) ? stageLabel(m) : `${m.tournamentName} · ${stageLabel(m)}`);

/** Target and requirement when chasing in the second innings. */
export function chase(m: Match, focus: Innings | null) {
  const list = sortedInnings(m);
  if (list.length < 2 || !focus || focus.inningsNo < 2) return null;
  const target = list[0].runs + 1;
  const need = target - focus.runs;
  const ballsLeft = (m.oversPerSide ?? 20) * 6 - legalBalls(focus);
  return { target, need, ballsLeft };
}

/** One-line summary: result, chase equation, or start time. */
export function headline(m: Match): string {
  if (!isCricket(m.sportType)) return pointsHeadline(m);
  const list = sortedInnings(m);
  if (m.status === "COMPLETED") {
    if (!m.winnerTeamId) return "Match tied / no result";
    const winner = teamById(m, m.winnerTeamId);
    const loserId = winner.id === home(m).id ? away(m).id : home(m).id;
    const w = inningsFor(m, winner.id);
    const l = inningsFor(m, loserId);
    if (w && l) {
      return w.inningsNo > l.inningsNo ? `${winner.name} won by ${10 - w.wickets} wickets` : `${winner.name} won by ${w.runs - l.runs} runs`;
    }
    return `${winner.name} won`;
  }
  if (m.status === "LIVE") {
    if (list.length >= 2) {
      const need = list[0].runs + 1 - list[1].runs;
      if (need > 0) return `${teamById(m, list[1].battingTeamId).name} need ${need} runs`;
    }
    const cur = currentInnings(m);
    if (cur) return `${teamById(m, cur.battingTeamId).name} batting · CRR ${fmt.runRate(cur.runs, cur.overs)}`;
    return "Match underway";
  }
  if (m.status === "ABANDONED") return "Match abandoned";
  return fmt.matchTime(parseDate(m.matchDate));
}

export const isLegal = (b: BallEvent) => b.extraType !== "WIDE" && b.extraType !== "NO_BALL";
export const isWicket = (b: BallEvent) => b.wicketType !== "NONE" && b.wicketType !== "RETIRED_HURT";

/** "W", "4", "6", "wd", "2nb", "1lb", "•" */
export function ballLabel(b: BallEvent): string {
  if (isWicket(b)) return "W";
  const total = b.runs + b.extras;
  switch (b.extraType) {
    case "WIDE":
      return total > 1 ? `${total}wd` : "wd";
    case "NO_BALL":
      return b.runs > 0 ? `${b.runs}nb` : "nb";
    case "BYE":
      return `${b.extras}b`;
    case "LEG_BYE":
      return `${b.extras}lb`;
  }
  return b.runs === 0 ? "•" : String(b.runs);
}

/** Groups deliveries into overs: over index = legal balls bowled before the delivery / 6. */
export function groupByOver(balls: BallEvent[]): Map<number, BallEvent[]> {
  const overs = new Map<number, BallEvent[]>();
  let legal = 0;
  for (const b of balls) {
    const o = Math.floor(legal / 6);
    overs.set(o, [...(overs.get(o) ?? []), b]);
    if (isLegal(b)) legal++;
  }
  return overs;
}

export function thisOver(balls: BallEvent[]): BallEvent[] {
  const grouped = groupByOver(balls);
  const keys = [...grouped.keys()];
  return keys.length ? grouped.get(keys[keys.length - 1])! : [];
}

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "BATSMAN":
      return "Batter";
    case "BOWLER":
      return "Bowler";
    case "ALL_ROUNDER":
      return "All-rounder";
    case "WICKET_KEEPER":
      return "Wicket-keeper";
    default:
      return fmt.label(role);
  }
}

export const bowlingLabel = (s: string | null | undefined) => (s === "NONE" ? "Doesn't bowl" : fmt.label(s));

export function playerPlace(p: Player): string {
  return [p.village, p.district, p.state].filter((s) => s && s.trim() && s !== "Unknown").join(", ");
}

export function playerAge(p: Player): number | null {
  const dob = parseDate(p.dateOfBirth);
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}

export const displayName = (a: Account) => (a.name?.trim() ? a.name.trim() : a.email.split("@")[0]);
export const firstName = (a: Account) => displayName(a).split(" ")[0];

/** Sports a player lists, primary first; older profiles are cricket only. */
export const sportsOf = (p: Player): string[] => (p.sports?.length ? p.sports : ["CRICKET"]);

/** "Cricket · Batter", or "Football · Goalkeeper, Kabaddi" for multi-sport players. */
export function playerSports(p: Player): string {
  const [main, ...rest] = sportsOf(p);
  const role = isCricket(main) ? roleLabel(p.playerRole) : p.position;
  const head = [sportOf(main).name, role].filter(Boolean).join(" · ");
  return rest.length ? `${head}, ${rest.map((s) => sportOf(s).name).join(", ")}` : head;
}
