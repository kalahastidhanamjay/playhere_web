import { useQuery } from "@tanstack/react-query";
import type { Registration, Standing, Team, Tournament } from "@/domain/models";
import { api } from "@/lib/api";
import { useUserId } from "@/lib/session";
import { storage } from "@/lib/storage";

export interface CreateTournamentInput {
  name: string;
  location: string;
  sportType: string;
  tournamentType: "LEAGUE" | "KNOCKOUT";
  startDate: string;
  endDate: string;
  entryFee?: number;
  prizePool?: number;
}

export const tournamentApi = {
  list: (status?: string) => api.get<Tournament[]>("/tournaments", { status }),
  discover: (city?: string, sport?: string) => api.get<Tournament[]>("/discovery/tournaments", { location: city, sport: sport || undefined }),
  mine: () => api.get<Tournament[]>("/tournaments/my"),
  byId: (id: string) => api.get<Tournament>(`/tournaments/${id}`),
  standings: (id: string) => api.get<Standing[]>(`/tournaments/${id}/standings`),
  registrations: (id: string) => api.get<Registration[]>(`/tournaments/${id}/registrations`),
  create: (input: CreateTournamentInput) => api.post<Tournament>("/tournaments", input),
  register: (id: string, teamId: string) => api.post(`/tournaments/${id}/register`, undefined, { teamId }),
  review: (id: string, teamId: string, approve: boolean) =>
    api.post(`/tournaments/${id}/registrations/${teamId}/${approve ? "approve" : "reject"}`),
  generateFixtures: (id: string) => api.post(`/tournaments/${id}/fixtures`),
  teamsOf: (teamId: string) => api.get<Tournament[]>(`/teams/${teamId}/tournaments`),
};

export const useTournaments = (status?: string) =>
  useQuery({ queryKey: ["tournaments", "list", status ?? "all"], queryFn: () => tournamentApi.list(status) });

export const useDiscoverTournaments = (sport = "") =>
  useQuery({ queryKey: ["tournaments", "discover", storage.city(), sport], queryFn: () => tournamentApi.discover(storage.city(), sport) });

export const useTournament = (id: string) => useQuery({ queryKey: ["tournament", id], queryFn: () => tournamentApi.byId(id) });
export const useStandings = (id: string) => useQuery({ queryKey: ["tournament", id, "standings"], queryFn: () => tournamentApi.standings(id) });

export function useRegistrations(id: string) {
  const userId = useUserId();
  return useQuery({ queryKey: ["tournament", id, "registrations", userId], queryFn: () => tournamentApi.registrations(id) });
}

export function useMyTournaments() {
  const userId = useUserId();
  return useQuery({ queryKey: ["tournaments", "mine", userId], queryFn: tournamentApi.mine, enabled: !!userId });
}

/** Tournaments you organise plus those your teams entered, labelled with your relationship. */
export function useMyCompetitions(teams: Team[] | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ["tournaments", "competitions", userId, (teams ?? []).map((t) => t.id).join(",")],
    enabled: !!userId && teams !== undefined,
    queryFn: async () => {
      const organised = await tournamentApi.mine();
      const byTeam = await Promise.all((teams ?? []).map(async (t) => [t, await tournamentApi.teamsOf(t.id)] as const));
      const seen = new Set<string>();
      const out: { tournament: Tournament; relation: string }[] = [];
      for (const t of organised) if (!seen.has(t.id) && seen.add(t.id)) out.push({ tournament: t, relation: "You organise" });
      for (const [team, list] of byTeam)
        for (const t of list) if (!seen.has(t.id) && seen.add(t.id)) out.push({ tournament: t, relation: team.name });
      return out;
    },
  });
}
