/** Response shapes of the PlayHere API (core-service read models). */

export interface Account {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  verified: boolean;
  createdAt: string | null;
}

export interface Tokens {
  accessToken: string;
  refreshToken?: string;
}

export interface TeamRef {
  id: string;
  name: string;
  logo: string | null;
}

export interface Innings {
  id: string;
  inningsNo: number;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  completed: boolean;
  /** On the field now; null when the scorer has to pick (start, wicket, new over). */
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
}

export type MatchStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED";

export interface Match {
  id: string;
  tournamentId: string | null;
  tournamentName: string;
  organizerId: string | null;
  scorerId: string | null;
  oversPerSide: number | null;
  /** Defaults to CRICKET on the server. */
  sportType: string;
  /** Goals / points total, or sets won. Null for cricket. */
  homeScore: number | null;
  awayScore: number | null;
  currentPeriod: number | null;
  plannedPeriods: number | null;
  periods: PeriodScore[] | null;
  matchType: string;
  status: MatchStatus;
  matchDate: string | null;
  location: string | null;
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  winnerTeamId: string | null;
  /** Server-written result, e.g. "Tigers won by 4 wickets" (cricket). */
  result: string | null;
  /** Players each side fields today; empty when not picked. */
  homePlaying: string[];
  awayPlaying: string[];
  streamActive: boolean;
  innings: Innings[];
}

export interface PeriodScore {
  period: number;
  home: number;
  away: number;
}

/** A goal, basket, raid point or rally in any sport other than cricket. */
export interface PointEvent {
  id: string;
  teamId: string;
  period: number;
  points: number;
  playerName: string | null;
  label: string | null;
  createdAt: string | null;
}

/** GET /matches/{id}/scorecard */
export interface ScorecardData {
  matchId: string;
  innings: InningsCard[];
}

export interface InningsCard {
  inningsId: string;
  inningsNo: number;
  battingTeamId: string;
  battingTeam: string;
  bowlingTeamId: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  overs: string;
  completed: boolean;
  batting: { playerId: string; name: string; dismissal: string; notOut: boolean; onStrike: boolean; runs: number; balls: number; fours: number; sixes: number; strikeRate: string }[];
  extras: { total: number; wides: number; noBalls: number; byes: number; legByes: number };
  yetToBat: string[];
  fallOfWickets: { wicket: number; score: number; playerId: string; name: string; over: string }[];
  bowling: { playerId: string; name: string; overs: string; maidens: number; runs: number; wickets: number; wides: number; noBalls: number; economy: string; bowling: boolean }[];
}

export interface BallEvent {
  id: string;
  runs: number;
  extras: number;
  extraType: "NONE" | "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE" | "PENALTY";
  wicketType: string;
  batsmanId: string | null;
  bowlerId: string | null;
  /** Set when the dismissed batter was not the striker (a run-out at the other end). */
  outPlayerId: string | null;
}

export type TournamentStatus = "DRAFT" | "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

export interface Tournament {
  id: string;
  name: string;
  location: string;
  organizerId: string;
  tournamentType: "LEAGUE" | "KNOCKOUT";
  sportType: string;
  status: TournamentStatus;
  startDate: string | null;
  endDate: string | null;
  entryFee: number | null;
  prizePool: number | null;
  teamsCount: number;
  pendingCount: number;
}

export interface Standing {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  matchesPlayed: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate: number;
}

export interface Team {
  id: string;
  name: string;
  logo: string | null;
  village: string | null;
  sportType: string;
  ownerId: string;
  squadSize: number;
  myRole: string | null;
  inviteCode: string | null;
  myRequestStatus: string | null;
}

export interface Registration {
  team: Team;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

export interface JoinRequest {
  id: string;
  userId: string;
  name: string;
  playerRole: string | null;
  place: string | null;
  createdAt: string | null;
}

export interface Player {
  id: string;
  name: string;
  playerCode: string | null;
  profilePhoto: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  dateOfBirth: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  playerRole: string | null;
  /** Sport ids, primary first. */
  sports: string[] | null;
  /** Position outside cricket, e.g. "Goalkeeper". */
  position: string | null;
  bio: string | null;
}

export interface CareerStats {
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  average: number;
  strikeRate: number;
  fifties: number;
  hundreds: number;
  wickets: number;
  runsConceded: number;
  oversBowled: number;
  economy: number;
  bowlingAverage: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  achievementDate: string | null;
  category: string | null;
}

/** One row of /discovery/rankings: a player, a team, or a scorer known by name. */
export interface RankingEntry {
  id: string | null;
  kind: "PLAYER" | "TEAM" | "NAME";
  name: string;
  logo: string | null;
  detail: string;
  teamId: string | null;
  matches: number;
  value: number;
  decimal: boolean;
}

export interface RankingCategory {
  id: string;
  label: string;
  decimal: boolean;
}

export interface SearchResults {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
}

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string | null;
}

export interface Venue {
  id: string;
  name: string;
  venueType: string;
  location: string;
  amenities: string | null;
  status: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: string;
  sport: string;
  role: string;
  location: string;
  deadline: string | null;
  organizationName: string;
}

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  status: string;
}

export interface Contract {
  id: string;
  playerId: string;
  teamId: string;
  offerAmount: number;
  startDate: string | null;
  endDate: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  createdAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  organizationType: string;
  primarySport: string;
  city: string;
  state: string;
  country: string;
  verificationStatus: string;
  verificationNotes: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  createdAt: string | null;
}

export interface UserProfile {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  gender: string | null;
  location: string | null;
}

export interface AccountSettings {
  language: string;
  defaultLocation: string | null;
  profileVisibility: string;
}

export interface NotificationPrefs {
  matchNotifications: boolean;
  teamNotifications: boolean;
  promotionalNotifications: boolean;
}

export const PLAYER_ROLES = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"] as const;
export const BATTING_STYLES = ["RIGHT_HAND", "LEFT_HAND"] as const;
export const BOWLING_STYLES = [
  "NONE",
  "RIGHT_ARM_FAST",
  "RIGHT_ARM_MEDIUM",
  "RIGHT_ARM_SPIN",
  "LEFT_ARM_FAST",
  "LEFT_ARM_MEDIUM",
  "LEFT_ARM_SPIN",
] as const;
export const WICKET_TYPES = ["BOWLED", "CAUGHT", "LBW", "RUN_OUT", "STUMPED", "HIT_WICKET", "RETIRED_HURT"] as const;
export const ORGANIZATION_TYPES = [
  "TOURNAMENT_ORGANIZER",
  "SPORTS_CLUB",
  "ACADEMY",
  "SCHOOL_COLLEGE",
  "CORPORATE",
  "COMMUNITY",
  "INDIVIDUAL",
  "OTHER",
] as const;
