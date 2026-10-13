import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { currentInnings, sortedInnings } from "@/domain/cricket";
import type { BallEvent, Innings, Match, PointEvent, ScorecardData } from "@/domain/models";
import { isCricket } from "@/domain/sports";
import { api } from "@/lib/api";
import { useUserId } from "@/lib/session";
import { storage } from "@/lib/storage";
import { subscribe } from "@/lib/stomp";

export const matchApi = {
  live: (city?: string, sport?: string) => api.get<Match[]>("/discovery/matches/live", { location: city, sport: sport || undefined }),
  upcoming: (city?: string, sport?: string) => api.get<Match[]>("/discovery/matches/upcoming", { location: city, sport: sport || undefined }),
  recent: (sport?: string) => api.get<Match[]>("/discovery/matches/recent", { sport: sport || undefined }),
  mine: () => api.get<Match[]>("/matches/my"),
  forTournament: (id: string) => api.get<Match[]>(`/matches/tournament/${id}`),
  byId: (id: string) => api.get<Match>(`/matches/${id}`),
  balls: (inningsId: string) => api.get<BallEvent[]>(`/matches/innings/${inningsId}/balls`),
  createFriendly: (body: {
    homeTeamId?: string;
    homeTeamName?: string;
    awayTeamId?: string;
    awayTeamName?: string;
    sportType: string;
    oversPerSide?: number;
    periods?: number;
    venue?: string;
  }) => api.post<Match>("/matches", body),
  scorecard: (id: string) => api.get<ScorecardData>(`/matches/${id}/scorecard`),
  points: (id: string) => api.get<PointEvent[]>(`/matches/${id}/points`),
  addPoints: (id: string, teamId: string, points: number, label?: string, playerName?: string) =>
    api.post<Match>(`/matches/${id}/points`, { teamId, points, label, playerName: playerName || undefined }),
  undoPoints: (id: string) => api.del<Match>(`/matches/${id}/points/last`),
  nextPeriod: (id: string) => api.post<Match>(`/matches/${id}/period/next`),
  start: (id: string) => api.post(`/matches/${id}/start`),
  openInnings: (id: string, inningsNo: number, battingTeamId: string, bowlingTeamId: string) =>
    api.post(`/matches/${id}/innings`, { inningsNo, battingTeamId, bowlingTeamId }),
  ball: (inningsId: string, b: { runs: number; extras: number; extraType: string; wicketType: string; outPlayerId?: string; fielderId?: string }) =>
    api.post("/matches/innings/ball-event", { inningsId, ...b }),
  setLineup: (inningsId: string, l: { strikerId?: string; nonStrikerId?: string; bowlerId?: string }) =>
    api.put(`/matches/innings/${inningsId}/lineup`, l),
  undo: (inningsId: string) => api.del(`/matches/innings/${inningsId}/last-ball`),
  endInnings: (inningsId: string) => api.post(`/matches/innings/${inningsId}/complete`),
  complete: (id: string, winnerTeamId?: string) => api.post(`/matches/${id}/complete`, undefined, { winnerTeamId }),
};

/** Discovery lists; `sport` "" means every sport. */
export const useLiveMatches = (sport = "") =>
  useQuery({ queryKey: ["matches", "live", storage.city(), sport], queryFn: () => matchApi.live(storage.city(), sport), refetchInterval: 30_000 });
export const useUpcomingMatches = (sport = "") =>
  useQuery({ queryKey: ["matches", "upcoming", storage.city(), sport], queryFn: () => matchApi.upcoming(storage.city(), sport) });
export const useRecentResults = (sport = "") => useQuery({ queryKey: ["matches", "recent", sport], queryFn: () => matchApi.recent(sport) });
export const useTournamentMatches = (id: string) => useQuery({ queryKey: ["matches", "tournament", id], queryFn: () => matchApi.forTournament(id) });

export function useMyMatches() {
  const userId = useUserId();
  return useQuery({ queryKey: ["matches", "mine", userId], queryFn: matchApi.mine, enabled: !!userId });
}

export interface MatchCenter {
  match: Match;
  focus: Innings | null;
  balls: BallEvent[];
  /** Scoring events for sports other than cricket. */
  points: PointEvent[];
}

async function loadCenter(id: string): Promise<MatchCenter> {
  const match = await matchApi.byId(id);
  if (!isCricket(match.sportType)) {
    const points = match.status === "SCHEDULED" ? [] : await matchApi.points(id);
    return { match, focus: null, balls: [], points };
  }
  const list = sortedInnings(match);
  const focus = currentInnings(match) ?? (list.length ? list[list.length - 1] : null);
  const balls = focus ? await matchApi.balls(focus.id) : [];
  return { match, focus, balls, points: [] };
}

export const matchCenterKey = (id: string) => ["match-center", id] as const;

/** Match + focused innings + its deliveries, refreshed by STOMP pushes with a polling fallback. */
export function useMatchCenter(id: string, { live = true } = {}) {
  const query = useQuery({
    queryKey: matchCenterKey(id),
    queryFn: () => loadCenter(id),
    refetchInterval: (q) => (live && q.state.data?.match.status !== "COMPLETED" ? 20_000 : false),
  });
  const queryClient = useQueryClient();
  const refetch = useRef(query.refetch);
  refetch.current = () => {
    void queryClient.invalidateQueries({ queryKey: ["scorecard", id] });
    return query.refetch();
  };
  const finished = query.data?.match.status === "COMPLETED";
  useEffect(() => {
    if (!live || finished) return;
    return subscribe(`/topic/match/${id}`, () => void refetch.current());
  }, [id, live, finished]);
  return query;
}

/** Full cricket scorecard; refreshed with the match centre while the match is live. */
export const useScorecard = (id: string, enabled: boolean, live: boolean) =>
  useQuery({ queryKey: ["scorecard", id], queryFn: () => matchApi.scorecard(id), enabled, refetchInterval: live ? 20_000 : false });
