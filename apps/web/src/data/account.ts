import { useQuery } from "@tanstack/react-query";
import type {
  AccountSettings,
  AppNotification,
  Contract,
  NotificationPrefs,
  Opportunity,
  OpportunityApplication,
  Organization,
  UserProfile,
  Venue,
} from "@/domain/models";
import { api } from "@/lib/api";
import { useUserId } from "@/lib/session";
import { storage } from "@/lib/storage";

export const authApi = {
  requestOtp: (email: string, name?: string) => api.post("/auth/otp/request", undefined, { phone: email.trim(), name: name?.trim() }),
  setPassword: (email: string, password: string) => api.post("/auth/password/setup", { phone: email.trim(), password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/account/password/change", { currentPassword, newPassword }),
  requestEmailChange: (newEmail: string) => api.post("/auth/account/email/change/request", { newEmail: newEmail.trim() }),
};

export const accountApi = {
  profile: () => api.get<UserProfile>("/users/me/profile"),
  updateProfile: (p: Partial<UserProfile>) => api.put<UserProfile>("/users/me/profile", p),
  settings: () => api.get<AccountSettings>("/users/me/settings"),
  updateSettings: (s: AccountSettings) => api.put<AccountSettings>("/users/me/settings", s),
  prefs: () => api.get<NotificationPrefs>("/users/me/preferences"),
  updatePrefs: (p: NotificationPrefs) => api.put<NotificationPrefs>("/users/me/preferences", p),
};

export const socialApi = {
  notifications: () => api.get<AppNotification[]>("/notifications"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  offers: () => api.get<Contract[]>("/contracts/my-offers"),
  acceptOffer: (id: string) => api.post(`/contracts/${id}/accept`),
  rejectOffer: (id: string) => api.post(`/contracts/${id}/reject`),
  offer: (body: { playerId: string; teamId: string; offerAmount: number; startDate: string; endDate: string }) =>
    api.post("/contracts/offer", body),
  /** Public: guests can browse trials too. */
  opportunities: () => api.get<Opportunity[]>("/discovery/opportunities"),
  applications: () => api.get<OpportunityApplication[]>("/opportunities/applications/my"),
  apply: (id: string, message?: string) => api.post(`/opportunities/${id}/apply`, { message }),
  venues: (city?: string) => api.get<Venue[]>("/venues", { location: city }),
  venue: (id: string) => api.get<Venue>(`/venues/${id}`),
  myOrganizations: () => api.get<Organization[]>("/organizations/my"),
  organization: (id: string) => api.get<Organization>(`/organizations/${id}`),
  createOrganization: (body: Record<string, unknown>) => api.post<Organization>("/organizations", body),
  submitOrganization: (id: string) => api.post<Organization>(`/organizations/${id}/submit-verification`),
  pendingOrganizations: () => api.get<Organization[]>("/admin/organizations/pending"),
  reviewOrganization: (id: string, action: string, notes?: string) => api.post(`/admin/organizations/${id}/${action}`, { notes }),
  follows: () => api.get<{ targetType: string; targetId: string }[]>("/follows"),
  follow: (type: string, id: string) => api.post("/follows", undefined, { targetType: type, targetId: id }),
  unfollow: (type: string, id: string) => api.del("/follows", { targetType: type, targetId: id }),
};

function useUserQuery<T>(key: string, fn: () => Promise<T>) {
  const userId = useUserId();
  return useQuery({ queryKey: [key, userId], queryFn: fn, enabled: !!userId });
}

export const useProfile = () => useUserQuery("profile", accountApi.profile);
export const useSettings = () => useUserQuery("settings", accountApi.settings);
export const usePrefs = () => useUserQuery("prefs", accountApi.prefs);
export const useOffers = () => useUserQuery("offers", socialApi.offers);
export const useApplications = () => useUserQuery("applications", socialApi.applications);
export const useMyOrganizations = () => useUserQuery("organizations", socialApi.myOrganizations);
export const useFollows = () => useUserQuery("follows", socialApi.follows);

export function useNotifications() {
  const userId = useUserId();
  return useQuery({ queryKey: ["notifications", userId], queryFn: socialApi.notifications, enabled: !!userId, refetchInterval: 60_000 });
}

export const useOpportunities = () => useQuery({ queryKey: ["opportunities"], queryFn: socialApi.opportunities });
export const useVenues = () => useQuery({ queryKey: ["venues", storage.city()], queryFn: () => socialApi.venues(storage.city()) });
export const useVenue = (id: string) => useQuery({ queryKey: ["venue", id], queryFn: () => socialApi.venue(id) });
export const useOrganization = (id: string) => useQuery({ queryKey: ["organization", id], queryFn: () => socialApi.organization(id) });
export const usePendingOrganizations = () => useQuery({ queryKey: ["admin", "organizations"], queryFn: socialApi.pendingOrganizations });
