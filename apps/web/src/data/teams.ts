import { useQuery } from "@tanstack/react-query";
import type { JoinRequest, Match, Player, Team, Tournament } from "@/domain/models";
import { api } from "@/lib/api";
import { useUserId } from "@/lib/session";

export const teamApi = {
  mine: () => api.get<Team[]>("/teams/my-teams"),
  all: () => api.get<Team[]>("/teams"),
  byId: (id: string) => api.get<Team>(`/teams/${id}`),
  squad: (id: string) => api.get<Player[]>(`/teams/${id}/squad`),
  matches: (id: string) => api.get<Match[]>(`/teams/${id}/matches`),
  tournaments: (id: string) => api.get<Tournament[]>(`/teams/${id}/tournaments`),
  create: (body: { name: string; sportType: string; village?: string; logo?: string }) => api.post<Team>("/teams", body),
  addPlayer: (id: string, playerId: string) => api.post<Player[]>(`/teams/${id}/squad`, { playerId, role: "PLAYER" }),
  /** Adds a player by name only (no account needed). */
  addGuest: (id: string, name: string) => api.post<Player[]>(`/teams/${id}/squad/guest`, { name }),
  removePlayer: (id: string, playerId: string) => api.del<Player[]>(`/teams/${id}/squad/${playerId}`),
  inviteCode: (id: string) => api.get<{ code: string }>(`/teams/${id}/invite`).then((r) => r.code),
  previewInvite: (code: string) => api.get<Team>(`/teams/invite/${code.trim().toUpperCase()}`),
  joinWithInvite: (code: string) => api.post<Team>(`/teams/invite/${code.trim().toUpperCase()}/join`),
  requestToJoin: (id: string) => api.post(`/teams/${id}/join-requests`),
  cancelRequest: (id: string) => api.del(`/teams/${id}/join-requests/mine`),
  joinRequests: (id: string) => api.get<JoinRequest[]>(`/teams/${id}/join-requests`),
  reviewRequest: (id: string, requestId: string, approve: boolean) =>
    api.post(`/teams/${id}/join-requests/${requestId}/${approve ? "approve" : "reject"}`),
};

export function useMyTeams() {
  const userId = useUserId();
  return useQuery({ queryKey: ["teams", "mine", userId], queryFn: teamApi.mine, enabled: !!userId });
}

/** Teams the viewer owns (can register, manage squad, offer contracts). */
export function useOwnedTeams() {
  const q = useMyTeams();
  return { ...q, data: q.data?.filter((t) => t.myRole === "TEAM_OWNER") };
}

export const useAllTeams = () => useQuery({ queryKey: ["teams", "all"], queryFn: teamApi.all });

export function useTeam(id: string) {
  const userId = useUserId();
  return useQuery({ queryKey: ["team", id, userId], queryFn: () => teamApi.byId(id) });
}

export const useSquad = (id: string) => useQuery({ queryKey: ["team", id, "squad"], queryFn: () => teamApi.squad(id) });
export const useTeamMatches = (id: string) => useQuery({ queryKey: ["team", id, "matches"], queryFn: () => teamApi.matches(id) });
export const useTeamTournaments = (id: string) => useQuery({ queryKey: ["team", id, "tournaments"], queryFn: () => teamApi.tournaments(id) });

export const useJoinRequests = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ["team", id, "join-requests"], queryFn: () => teamApi.joinRequests(id), enabled });

export const useInviteCode = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ["team", id, "invite"], queryFn: () => teamApi.inviteCode(id), enabled });

export function useInvitePreview(code: string) {
  const userId = useUserId();
  return useQuery({ queryKey: ["invite", code.toUpperCase(), userId], queryFn: () => teamApi.previewInvite(code), retry: false });
}
