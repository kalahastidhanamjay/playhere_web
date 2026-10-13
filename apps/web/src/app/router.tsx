import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation, useRouteError } from "react-router";
import { ErrorView, SkeletonList } from "@/components/ui";
import { useSession } from "@/lib/session";
import { AppShell } from "./AppShell";

const RELOADED_KEY = "ph.reloaded-for-new-version";

/**
 * After a new deploy, a tab opened earlier asks for page files that no longer exist.
 * Reload once onto the new version instead of showing an error; give up if that already happened.
 */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still try a single reload.
  }
  window.location.reload();
  return true;
}

/** Code-split each page; most visitors only ever open one or two. */
function page(load: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(() =>
    load().catch((error: unknown) => {
      // Never resolves when reloading, so the user sees the loading skeleton, then the new version.
      if (reloadForNewVersion()) return new Promise<{ default: ComponentType }>(() => {});
      throw error;
    }),
  );
  return (
    <Suspense
      fallback={
        <div className="page">
          <SkeletonList count={3} height={120} />
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

/** Sends guests to sign in and brings them back afterwards. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { account, status } = useSession();
  const location = useLocation();
  if (status === "loading") {
    return (
      <div className="page">
        <SkeletonList count={3} height={120} />
      </div>
    );
  }
  if (!account) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

const auth = (node: ReactNode) => <RequireAuth>{node}</RequireAuth>;

function RouteError() {
  const error = useRouteError();
  return (
    <div className="page">
      <ErrorView error={error instanceof Error ? error : new Error("This page could not be loaded")} onRetry={() => window.location.reload()} />
    </div>
  );
}

export const router = createBrowserRouter([
  // Auth screens have their own full-screen layout.
  { path: "/login", element: page(() => import("@/features/auth/LoginPage")) },
  { path: "/register", element: page(() => import("@/features/auth/RegisterPage")) },
  { path: "/verify", element: page(() => import("@/features/auth/VerifyPage")) },
  { path: "/set-password", element: page(() => import("@/features/auth/SetPasswordPage")) },
  { path: "/forgot-password", element: page(() => import("@/features/auth/ForgotPasswordPage")) },
  { path: "/onboarding", element: auth(page(() => import("@/features/players/OnboardingPage"))) },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: page(() => import("@/features/home/HomePage")) },
      { path: "/search", element: page(() => import("@/features/search/SearchPage")) },
      { path: "/matches", element: page(() => import("@/features/matches/MatchesPage")) },
      { path: "/matches/:id", element: page(() => import("@/features/matches/MatchCenterPage")) },
      { path: "/matches/:id/score", element: auth(page(() => import("@/features/matches/ScorerPage"))) },
      { path: "/quick-match", element: auth(page(() => import("@/features/matches/QuickMatchPage"))) },
      { path: "/tournaments", element: page(() => import("@/features/tournaments/TournamentsPage")) },
      { path: "/tournaments/new", element: auth(page(() => import("@/features/tournaments/CreateTournamentPage"))) },
      { path: "/tournaments/:id", element: page(() => import("@/features/tournaments/TournamentPage")) },
      { path: "/teams/new", element: auth(page(() => import("@/features/teams/CreateTeamPage"))) },
      { path: "/teams/:id", element: page(() => import("@/features/teams/TeamPage")) },
      { path: "/join/:code", element: page(() => import("@/features/teams/JoinTeamPage")) },
      { path: "/players/:id", element: page(() => import("@/features/players/PlayerPage")) },
      { path: "/leaderboard", element: page(() => import("@/features/players/LeaderboardPage")) },
      { path: "/me", element: page(() => import("@/features/me/MePage")) },
      { path: "/me/player", element: auth(page(() => import("@/features/players/PlayerEditPage"))) },
      { path: "/settings", element: auth(page(() => import("@/features/me/SettingsPage"))) },
      { path: "/settings/account", element: auth(page(() => import("@/features/me/EditAccountPage"))) },
      { path: "/settings/password", element: auth(page(() => import("@/features/me/ChangePasswordPage"))) },
      { path: "/settings/email", element: auth(page(() => import("@/features/me/ChangeEmailPage"))) },
      { path: "/settings/notifications", element: auth(page(() => import("@/features/me/NotificationPrefsPage"))) },
      { path: "/settings/privacy", element: auth(page(() => import("@/features/me/PrivacyPage"))) },
      { path: "/notifications", element: auth(page(() => import("@/features/more/NotificationsPage"))) },
      { path: "/offers", element: auth(page(() => import("@/features/more/OffersPage"))) },
      { path: "/opportunities", element: page(() => import("@/features/more/OpportunitiesPage")) },
      { path: "/venues", element: page(() => import("@/features/more/VenuesPage")) },
      { path: "/venues/:id", element: page(() => import("@/features/more/VenuePage")) },
      { path: "/organizations", element: auth(page(() => import("@/features/more/OrganizationsPage"))) },
      { path: "/organizations/new", element: auth(page(() => import("@/features/more/CreateOrganizationPage"))) },
      { path: "/organizations/:id", element: auth(page(() => import("@/features/more/OrganizationPage"))) },
      { path: "/admin", element: auth(page(() => import("@/features/more/AdminPage"))) },
      { path: "*", element: page(() => import("@/features/more/NotFoundPage")) },
    ],
  },
]);
