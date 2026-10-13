import { useQuery } from "@tanstack/react-query";
import type { Achievement, CareerStats, Player, RankingCategory, RankingEntry, SearchResults } from "@/domain/models";
import { api, ApiError } from "@/lib/api";
import { useUserId } from "@/lib/session";

export interface PlayerInput {
  name: string;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  dateOfBirth?: string | null;
  battingStyle: string;
  bowlingStyle: string;
  playerRole: string;
  sports: string[];
  position?: string | null;
  bio?: string | null;
}

const EMPTY_STATS: CareerStats = {
  matches: 0, innings: 0, runs: 0, ballsFaced: 0, average: 0, strikeRate: 0, fifties: 0, hundreds: 0,
  wickets: 0, runsConceded: 0, oversBowled: 0, economy: 0, bowlingAverage: 0,
};

/** Treat "no record" answers (404 / 400 "not found") as empty instead of errors. */
async function orFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    const err = ApiError.from(e);
    if (err.kind === "notFound" || err.kind === "validation") return fallback;
    throw err;
  }
}

export const playerApi = {
  mine: () => orFallback<Player | null>(api.get<Player>("/players/me"), null),
  byId: (id: string) => api.get<Player>(`/players/${id}`),
  stats: (id: string) => orFallback(api.get<CareerStats>(`/players/${id}/stats`), EMPTY_STATS),
  achievements: (id: string) => orFallback(api.get<Achievement[]>(`/players/${id}/achievements`), []),
  create: (input: PlayerInput) => api.post<Player>("/players", input),
  update: (input: PlayerInput) => api.put<Player>("/players", input),
  /** Public: works for guests. */
  rankings: (sport: string, category?: string, limit = 20) =>
    api.get<RankingEntry[]>("/discovery/rankings", { sport, category: category || undefined, limit }),
  rankingCategories: (sport: string) => api.get<RankingCategory[]>("/discovery/rankings/categories", { sport }),
  watchlist: () => api.get<Player[]>("/players/watchlist"),
  watch: (id: string) => api.post(`/players/watchlist/${id}`),
  unwatch: (id: string) => api.del(`/players/watchlist/${id}`),
  search: (q: string) => api.get<SearchResults>("/discovery/search", { q }),
};

export function useMyPlayer() {
  const userId = useUserId();
  return useQuery({ queryKey: ["player", "me", userId], queryFn: playerApi.mine, enabled: !!userId });
}

export const usePlayer = (id: string) => useQuery({ queryKey: ["player", id], queryFn: () => playerApi.byId(id) });
export const usePlayerStats = (id: string | undefined) =>
  useQuery({ queryKey: ["player", id, "stats"], queryFn: () => playerApi.stats(id!), enabled: !!id });
export const useAchievements = (id: string) => useQuery({ queryKey: ["player", id, "achievements"], queryFn: () => playerApi.achievements(id) });
export const useRankings = (sport: string, category?: string, limit = 20) =>
  useQuery({ queryKey: ["rankings", sport, category ?? "", limit], queryFn: () => playerApi.rankings(sport, category, limit) });
export const useRankingCategories = (sport: string) =>
  useQuery({ queryKey: ["rankings", "categories", sport], queryFn: () => playerApi.rankingCategories(sport), staleTime: Infinity });

export function useWatchlist() {
  const userId = useUserId();
  return useQuery({ queryKey: ["watchlist", userId], queryFn: playerApi.watchlist, enabled: !!userId });
}

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ["search", q.trim().toLowerCase()],
    queryFn: () => playerApi.search(q.trim()),
    enabled: q.trim().length >= 2,
    placeholderData: (prev) => prev,
  });
