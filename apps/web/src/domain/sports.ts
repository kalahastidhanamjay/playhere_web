import type { LucideIcon } from "lucide-react";
import { Basketball, Cricket, Football, HockeyStick, Kabaddi, KhoKho, Paddle, Racket, Shuttlecock, Volleyball } from "@/components/icons";
import { PLAYER_ROLES } from "./models";

/** Mirrors core-service's Sport enum (GET /discovery/sports). */
export type SportId =
  | "CRICKET"
  | "FOOTBALL"
  | "HOCKEY"
  | "BASKETBALL"
  | "KABADDI"
  | "KHO_KHO"
  | "VOLLEYBALL"
  | "THROWBALL"
  | "BADMINTON"
  | "TABLE_TENNIS"
  | "TENNIS"
  | "PICKLEBALL";

/** INNINGS: cricket ball by ball. GOALS / POINTS: running total. SETS: sets or games won decide it. */
export type ScoringModel = "INNINGS" | "GOALS" | "POINTS" | "SETS";

export interface Sport {
  id: SportId;
  name: string;
  icon: LucideIcon;
  colors: [string, string];
  scoring: ScoringModel;
  /** "Half", "Quarter", "Set", "Game". */
  period: string;
  defaultPeriods: number;
  periodChoices: number[];
  /** Buttons on the scorer pad. */
  scoreKeys: { points: number; label: string }[];
  /** What one point is called on the pad and in the timeline. */
  unit: string;
  positions: readonly string[];
  /** Where it is played, for form placeholders. */
  ground: string;
}

const RACKET_POSITIONS = ["Singles", "Doubles", "Mixed doubles"] as const;
const one = (label: string) => [{ points: 1, label }];

export const SPORTS: Sport[] = [
  {
    id: "CRICKET", name: "Cricket", icon: Cricket, colors: ["#FF9A4D", "#FF3D5A"], scoring: "INNINGS",
    period: "Innings", defaultPeriods: 2, periodChoices: [], scoreKeys: [], unit: "run",
    positions: PLAYER_ROLES, ground: "SV University Ground",
  },
  {
    id: "FOOTBALL", name: "Football", icon: Football, colors: ["#2BD67B", "#0E9F6E"], scoring: "GOALS",
    period: "Half", defaultPeriods: 2, periodChoices: [2], scoreKeys: one("Goal"), unit: "goal",
    positions: ["Goalkeeper", "Defender", "Midfielder", "Forward"], ground: "Municipal football ground",
  },
  {
    id: "HOCKEY", name: "Hockey", icon: HockeyStick, colors: ["#4DA3FF", "#3D5AFE"], scoring: "GOALS",
    period: "Quarter", defaultPeriods: 4, periodChoices: [2, 4], scoreKeys: one("Goal"), unit: "goal",
    positions: ["Goalkeeper", "Defender", "Midfielder", "Forward"], ground: "Astro turf",
  },
  {
    id: "BASKETBALL", name: "Basketball", icon: Basketball, colors: ["#FFB547", "#FF6A2B"], scoring: "POINTS",
    period: "Quarter", defaultPeriods: 4, periodChoices: [2, 4],
    scoreKeys: [{ points: 1, label: "Free throw" }, { points: 2, label: "2 points" }, { points: 3, label: "3 points" }], unit: "point",
    positions: ["Point guard", "Shooting guard", "Small forward", "Power forward", "Center"], ground: "Indoor court",
  },
  {
    id: "KABADDI", name: "Kabaddi", icon: Kabaddi, colors: ["#FF6B6B", "#C2185B"], scoring: "POINTS",
    period: "Half", defaultPeriods: 2, periodChoices: [2],
    scoreKeys: [{ points: 1, label: "1 point" }, { points: 2, label: "2 points" }, { points: 3, label: "Super raid" }], unit: "point",
    positions: ["Raider", "Defender", "All-rounder"], ground: "Village mat court",
  },
  {
    id: "KHO_KHO", name: "Kho Kho", icon: KhoKho, colors: ["#B983FF", "#7C4DFF"], scoring: "POINTS",
    period: "Turn", defaultPeriods: 4, periodChoices: [2, 4], scoreKeys: one("Tag"), unit: "point",
    positions: ["Chaser", "Runner", "All-rounder"], ground: "School ground",
  },
  {
    id: "VOLLEYBALL", name: "Volleyball", icon: Volleyball, colors: ["#FFD166", "#F59E0B"], scoring: "SETS",
    period: "Set", defaultPeriods: 5, periodChoices: [3, 5], scoreKeys: one("Point"), unit: "point",
    positions: ["Setter", "Outside hitter", "Middle blocker", "Opposite", "Libero"], ground: "Beach or indoor court",
  },
  {
    id: "THROWBALL", name: "Throwball", icon: Volleyball, colors: ["#5EEAD4", "#0D9488"], scoring: "SETS",
    period: "Set", defaultPeriods: 3, periodChoices: [1, 3], scoreKeys: one("Point"), unit: "point",
    positions: ["Server", "Attacker", "Defender"], ground: "College court",
  },
  {
    id: "BADMINTON", name: "Badminton", icon: Shuttlecock, colors: ["#7DD3FC", "#0284C7"], scoring: "SETS",
    period: "Game", defaultPeriods: 3, periodChoices: [1, 3, 5], scoreKeys: one("Point"), unit: "point",
    positions: RACKET_POSITIONS, ground: "Indoor stadium court 2",
  },
  {
    id: "TABLE_TENNIS", name: "Table tennis", icon: Paddle, colors: ["#F472B6", "#DB2777"], scoring: "SETS",
    period: "Game", defaultPeriods: 5, periodChoices: [3, 5, 7], scoreKeys: one("Point"), unit: "point",
    positions: RACKET_POSITIONS, ground: "Club hall, table 1",
  },
  {
    id: "TENNIS", name: "Tennis", icon: Racket, colors: ["#D9F99D", "#65A30D"], scoring: "SETS",
    period: "Set", defaultPeriods: 3, periodChoices: [1, 3, 5], scoreKeys: one("Game"), unit: "game",
    positions: RACKET_POSITIONS, ground: "Clay court 1",
  },
  {
    id: "PICKLEBALL", name: "Pickleball", icon: Paddle, colors: ["#A3E635", "#16A34A"], scoring: "SETS",
    period: "Game", defaultPeriods: 3, periodChoices: [1, 3], scoreKeys: one("Point"), unit: "point",
    positions: RACKET_POSITIONS, ground: "Community court",
  },
];

const BY_ID = new Map(SPORTS.map((s) => [s.id, s]));

/** Unknown or missing values are treated as cricket, matching the server. */
export const sportOf = (id: string | null | undefined): Sport => BY_ID.get((id ?? "CRICKET") as SportId) ?? SPORTS[0];

export const isCricket = (id: string | null | undefined) => sportOf(id).scoring === "INNINGS";

/** "goals", "points", "sets". */
export function scoreNoun(sport: Sport, n: number): string {
  const word = sport.scoring === "SETS" ? sport.period.toLowerCase() : sport.unit;
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Column heading for the standings tie-breaker. */
export const differenceLabel = (sport: Sport) =>
  sport.scoring === "INNINGS" ? "NRR" : sport.scoring === "GOALS" ? "GD" : "+/-";
