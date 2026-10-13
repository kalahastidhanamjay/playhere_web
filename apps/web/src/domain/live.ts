import type { LucideIcon } from "lucide-react";
import { ArrowUpDown, Ban, CircleCheck, CircleDot, CircleX, Flag, Gavel, Hand, Plus, Pointer, RectangleVertical, TimerOff, Undo2, UsersRound, Zap } from "lucide-react";
import { Basketball, Football, HockeyStick, Kabaddi, KhoKho } from "@/components/icons";
import type { LiveState, Match } from "./models";
import { sportOf, type Sport } from "./sports";

/** What the scorer picks for an action. */
export type ActionInput = "none" | "player" | "playerAssist" | "substitution" | "raid" | "tag";

export interface SportAction {
  /** Server event type. */
  type: string;
  label: string;
  icon: LucideIcon;
  input: ActionInput;
  color?: string;
  /** Big button; the rest are chips. */
  primary?: boolean;
}

export interface SportLive {
  actions: SportAction[];
  /** UP (minutes played), DOWN (time left) or NONE. */
  clock: "UP" | "DOWN" | "NONE";
  periodMinutes: number;
  minuteChoices: number[];
  extraTime: boolean;
  /** Extra-time halves (football) or overtime periods (basketball). */
  extraPeriods: number;
  shootout: boolean;
  extraLabel: string;
}

const YELLOW = "#F5C451";
const RED = "#FF4D5E";
const GREEN = "#2BD67B";

const SUB: SportAction = { type: "SUBSTITUTION", label: "Sub", icon: ArrowUpDown, input: "substitution" };
const TIMEOUT: SportAction = { type: "TIMEOUT", label: "Timeout", icon: TimerOff, input: "none" };
const card = (type: string, label: string, color: string): SportAction => ({ type, label, icon: RectangleVertical, input: "player", color });

const base: Omit<SportLive, "actions"> = { clock: "NONE", periodMinutes: 0, minuteChoices: [], extraTime: false, extraPeriods: 0, shootout: false, extraLabel: "Extra time" };
const POINT: SportAction = { type: "POINT", label: "Point", icon: Plus, input: "none", primary: true };

/** Everything a scorer can record per sport (mirrors core-service SportRules). */
export function liveRulesFor(sport: Sport): SportLive {
  switch (sport.id) {
    case "FOOTBALL":
      return {
        ...base, clock: "UP", periodMinutes: 45, minuteChoices: [10, 15, 20, 25, 30, 35, 40, 45], extraTime: true, extraPeriods: 2, shootout: true,
        actions: [
          { type: "GOAL", label: "Goal", icon: Football, input: "playerAssist", primary: true },
          { type: "PENALTY_GOAL", label: "Penalty goal", icon: CircleDot, input: "player" },
          { type: "PENALTY_MISS", label: "Penalty missed", icon: Ban, input: "player" },
          { type: "OWN_GOAL", label: "Own goal", icon: Undo2, input: "player" },
          card("YELLOW_CARD", "Yellow", YELLOW),
          card("RED_CARD", "Red", RED),
          SUB,
        ],
      };
    case "HOCKEY":
      return {
        ...base, clock: "DOWN", periodMinutes: 15, minuteChoices: [5, 7, 10, 12, 15], shootout: true,
        actions: [
          { type: "GOAL", label: "Goal", icon: HockeyStick, input: "playerAssist", primary: true },
          { type: "PENALTY_CORNER", label: "Penalty corner", icon: Flag, input: "none" },
          { type: "PENALTY_STROKE_GOAL", label: "Stroke goal", icon: CircleDot, input: "player" },
          { type: "PENALTY_STROKE_MISS", label: "Stroke missed", icon: Ban, input: "player" },
          { type: "OWN_GOAL", label: "Own goal", icon: Undo2, input: "player" },
          card("GREEN_CARD", "Green", GREEN),
          card("YELLOW_CARD", "Yellow", YELLOW),
          card("RED_CARD", "Red", RED),
          SUB,
        ],
      };
    case "BASKETBALL":
      return {
        ...base, clock: "DOWN", periodMinutes: 10, minuteChoices: [5, 8, 10, 12], extraTime: true, extraPeriods: 1, extraLabel: "Overtime",
        actions: [
          { type: "TWO_POINTER", label: "+2", icon: Basketball, input: "player", primary: true },
          { type: "THREE_POINTER", label: "+3", icon: Basketball, input: "player", primary: true },
          { type: "FREE_THROW", label: "+1 free throw", icon: Basketball, input: "player", primary: true },
          { type: "FOUL", label: "Foul", icon: Hand, input: "player" },
          TIMEOUT,
          SUB,
        ],
      };
    case "KABADDI":
      return {
        ...base, clock: "DOWN", periodMinutes: 20, minuteChoices: [10, 15, 20],
        actions: [
          { type: "RAID_POINTS", label: "Raid", icon: Kabaddi, input: "raid", primary: true },
          { type: "TACKLE", label: "Tackle", icon: Hand, input: "player", primary: true },
          { type: "SUPER_TACKLE", label: "Super tackle", icon: Zap, input: "player" },
          { type: "ALL_OUT", label: "All out +2", icon: UsersRound, input: "none" },
          { type: "TECHNICAL_POINT", label: "Technical pt", icon: Gavel, input: "none" },
          card("GREEN_CARD", "Green", GREEN),
          card("YELLOW_CARD", "Yellow", YELLOW),
          card("RED_CARD", "Red", RED),
          TIMEOUT,
          SUB,
        ],
      };
    case "KHO_KHO":
      return {
        ...base, clock: "DOWN", periodMinutes: 7, minuteChoices: [5, 7, 9],
        actions: [{ type: "TAG", label: "Tag out", icon: Pointer, input: "tag", primary: true }, { ...TIMEOUT }, SUB],
      };
    case "VOLLEYBALL":
    case "THROWBALL":
      return { ...base, actions: [POINT, TIMEOUT, SUB] };
    default:
      return { ...base, actions: [POINT] };
  }
}

export const SHOOTOUT_ACTIONS: SportAction[] = [
  { type: "SHOOTOUT_GOAL", label: "Scored", icon: CircleCheck, input: "player", color: GREEN, primary: true },
  { type: "SHOOTOUT_MISS", label: "Missed", icon: CircleX, input: "player", color: RED, primary: true },
];

/** Icon and colour for an event in the timeline. */
export function eventStyle(type: string): { icon: LucideIcon; color?: string } {
  switch (type) {
    case "GOAL": case "PENALTY_GOAL": case "PENALTY_STROKE_GOAL": return { icon: Football };
    case "OWN_GOAL": return { icon: Football, color: RED };
    case "PENALTY_MISS": case "PENALTY_STROKE_MISS": case "SHOOTOUT_MISS": return { icon: CircleX, color: RED };
    case "SHOOTOUT_GOAL": return { icon: CircleCheck, color: GREEN };
    case "YELLOW_CARD": return { icon: RectangleVertical, color: YELLOW };
    case "RED_CARD": return { icon: RectangleVertical, color: RED };
    case "GREEN_CARD": return { icon: RectangleVertical, color: GREEN };
    case "SUBSTITUTION": return { icon: ArrowUpDown };
    case "FOUL": return { icon: Hand };
    case "TIMEOUT": return { icon: TimerOff };
    case "RAID_POINTS": case "EMPTY_RAID": return { icon: Kabaddi };
    case "TACKLE": case "SUPER_TACKLE": return { icon: Hand };
    case "ALL_OUT": return { icon: UsersRound };
    case "TAG": return { icon: KhoKho };
    case "PENALTY_CORNER": return { icon: Flag };
    case "TWO_POINTER": case "THREE_POINTER": case "FREE_THROW": return { icon: Basketball };
    default: return { icon: Plus };
  }
}

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

/** "1st half", "Extra time 2nd half", "Quarter 3", "Overtime 1", "Set 2", "Penalty shootout". */
export function livePeriodLabel(m: Match, phase = m.phase ?? "REGULAR", period = m.currentPeriod ?? 1): string {
  if (phase === "SHOOTOUT") return "Penalty shootout";
  const sport = sportOf(m.sportType);
  const rules = liveRulesFor(sport);
  const planned = m.plannedPeriods ?? sport.defaultPeriods;
  if (period > planned) {
    const n = period - planned;
    return rules.extraLabel === "Overtime" ? `Overtime ${n}` : `Extra time ${ordinal(n)} half`;
  }
  if (sport.period === "Half") return `${ordinal(period)} half`;
  return `${sport.period} ${period}`;
}

const mmss = (s: number) => {
  const v = Math.max(0, s);
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

export interface ClockReading {
  /** "47:13" (minutes played) or "04:21" (time left). */
  main: string;
  /** Stoppage time beyond the period, e.g. "+02:05". */
  added: string | null;
  timeUp: boolean;
}

/** Reads the clock from a snapshot, moving it on locally while it runs. */
export function readClock(
  m: Match,
  c: { direction: string; running: boolean; seconds: number; periodSeconds: number },
  fetchedAt: number,
  period = m.currentPeriod ?? 1,
): ClockReading {
  const rules = liveRulesFor(sportOf(m.sportType));
  const now = c.running ? c.seconds + Math.floor((Date.now() - fetchedAt) / 1000) : c.seconds;
  const regular = (m.periodMinutes ?? rules.periodMinutes) * 60;
  const len = c.periodSeconds > 0 ? c.periodSeconds : regular;
  const timeUp = len > 0 && now >= len;
  if (c.direction === "UP") {
    const planned = m.plannedPeriods ?? sportOf(m.sportType).defaultPeriods;
    const start = period <= planned ? (period - 1) * len : planned * regular + (period - planned - 1) * len;
    return { main: mmss(start + Math.min(now, len)), added: timeUp ? `+${mmss(now - len)}` : null, timeUp };
  }
  return { main: mmss(len - now), added: null, timeUp };
}

export interface PlayerLine {
  goals: number;
  assists: number;
  points: number;
  fouls: number;
  tackles: number;
  raid: number;
  tags: number;
  yellow: boolean;
  red: boolean;
  green: boolean;
}

/** Each player's goals, assists, points, fouls and cards from the live events (shootout kicks excluded). */
export function playerLines(live: LiveState): Map<string, PlayerLine> {
  const out = new Map<string, PlayerLine>();
  const of = (id: string) => {
    let l = out.get(id);
    if (!l) {
      l = { goals: 0, assists: 0, points: 0, fouls: 0, tackles: 0, raid: 0, tags: 0, yellow: false, red: false, green: false };
      out.set(id, l);
    }
    return l;
  };
  for (const e of live.events) {
    if (e.phase === "SHOOTOUT" || !e.playerId) continue;
    const l = of(e.playerId);
    switch (e.type) {
      case "GOAL": case "PENALTY_GOAL": case "PENALTY_STROKE_GOAL":
        l.goals++;
        if (e.relatedPlayerId) of(e.relatedPlayerId).assists++;
        break;
      case "FREE_THROW": case "TWO_POINTER": case "THREE_POINTER": l.points += e.points; break;
      case "FOUL": l.fouls++; break;
      case "RAID_POINTS": l.raid += e.points; break;
      case "TACKLE": case "SUPER_TACKLE": l.tackles += e.points; break;
      case "TAG": l.tags++; break;
      case "YELLOW_CARD": l.yellow = true; break;
      case "RED_CARD": l.red = true; break;
      case "GREEN_CARD": l.green = true; break;
    }
  }
  return out;
}

export function lineSummary(sport: Sport, l: PlayerLine | undefined): string {
  if (!l) return "";
  const parts: string[] = [];
  if (sport.id === "FOOTBALL" || sport.id === "HOCKEY") {
    if (l.goals) parts.push(`${l.goals} G`);
    if (l.assists) parts.push(`${l.assists} A`);
  } else if (sport.id === "BASKETBALL") {
    if (l.points) parts.push(`${l.points} pts`);
    if (l.fouls) parts.push(`${l.fouls} F`);
  } else if (sport.id === "KABADDI") {
    if (l.raid) parts.push(`${l.raid} raid`);
    if (l.tackles) parts.push(`${l.tackles} tkl`);
  } else if (sport.id === "KHO_KHO" && l.tags) {
    parts.push(`${l.tags} tags`);
  }
  return parts.join(" · ");
}

export const isGoalEvent = (type: string) => type === "GOAL" || type === "PENALTY_GOAL" || type === "PENALTY_STROKE_GOAL";

/** Players a side normally starts with. */
export const STARTERS: Partial<Record<string, number>> = { FOOTBALL: 11, HOCKEY: 11, BASKETBALL: 5, KABADDI: 7, KHO_KHO: 9, VOLLEYBALL: 6, THROWBALL: 7, CRICKET: 11 };
