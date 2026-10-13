import { LogoMark } from "@playhere/brand";
import {
  BarChart3,
  Bell,
  Building2,
  Home,
  LayoutGrid,
  Megaphone,
  Plus,
  Search,
  Settings,
  Trophy,
  UserRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Whistle } from "@/components/icons";
import { useSportFilter } from "@/components/sport";
import { Avatar, Button, Crest, cx } from "@/components/ui";
import { useNotifications } from "@/data/account";
import { useLiveMatches } from "@/data/matches";
import { useMyTeams } from "@/data/teams";
import { displayName } from "@/domain/cricket";
import { SPORTS } from "@/domain/sports";
import { useSession } from "@/lib/session";
import { StartMenu } from "./StartMenu";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const MAIN: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/matches", label: "Matches", icon: Whistle },
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/leaderboard", label: "Rankings", icon: BarChart3 },
];

const EXPLORE: NavItem[] = [
  { to: "/venues", label: "Grounds & courts", icon: Warehouse },
  { to: "/opportunities", label: "Trials & academies", icon: Megaphone },
  { to: "/organizations", label: "Organisations", icon: Building2 },
];

/** Phone tab bar: the four destinations people use most, around a centre ＋. */
const TABS: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/matches", label: "Matches", icon: Whistle },
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/me", label: "Me", icon: UserRound },
];

/**
 * Desktop: a left sidebar (sections, sports, your teams, account) beside a top bar with search.
 * Tablets get the sidebar as an icon rail; phones get a compact top bar and a bottom tab bar.
 */
export function AppShell() {
  const { account } = useSession();
  const [startOpen, setStartOpen] = useState(false);
  const unread = useNotifications().data?.filter((n) => !n.read).length ?? 0;
  const liveCount = useLiveMatches().data?.length ?? 0;
  const location = useLocation();

  // New page: start at the top, like a normal website.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <Sidebar liveCount={liveCount} onStart={() => setStartOpen(true)} />

      <div className="app-main">
        <header className="appbar">
          <Link to="/" aria-label="PlayHere home" className="appbar-logo">
            <LogoMark size={32} />
          </Link>
          <SearchBox />
          <span className="spacer" />
          <span className="show-tablet">
            <Button size="sm" icon={Plus} onClick={() => setStartOpen(true)}>Start</Button>
          </span>
          {account ? (
            <>
              <Link to="/notifications" className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} title="Notifications">
                <Bell size={19} />
                {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
              </Link>
              <Link to="/me" className="appbar-avatar" aria-label="Your profile">
                <Avatar name={displayName(account)} size={36} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm hide-mobile">Join free</Link>
            </>
          )}
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {TABS.slice(0, 2).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
            <n.icon size={22} aria-hidden />
            {n.label}
            {n.to === "/matches" && liveCount > 0 && <span className="live-dot tab-live" aria-label="matches live" />}
          </NavLink>
        ))}
        <button type="button" className="start" aria-label="Start a match, team or tournament" onClick={() => setStartOpen(true)}>
          <Plus size={26} />
        </button>
        {TABS.slice(2).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
            <n.icon size={22} aria-hidden />
            {n.label}
          </NavLink>
        ))}
      </nav>

      <StartMenu open={startOpen} onClose={() => setStartOpen(false)} />
    </div>
  );
}

function Sidebar({ liveCount, onStart }: { liveCount: number; onStart: () => void }) {
  const { account } = useSession();
  const [sport, setSport] = useSportFilter();
  const teams = useMyTeams().data ?? [];

  const link = (n: NavItem, badge?: number) => (
    <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx("side-link", isActive && "active")} title={n.label}>
      <n.icon size={18} aria-hidden />
      <span className="side-label">{n.label}</span>
      {badge ? <span className="side-badge" aria-label={`${badge} live`}>{badge} live</span> : null}
    </NavLink>
  );

  return (
    <aside className="sidebar" aria-label="Main">
      <Link to="/" className="side-brand" aria-label="PlayHere home">
        <LogoMark size={34} />
        <span className="side-label">PlayHere</span>
      </Link>

      <button type="button" className="side-start" onClick={onStart} title="Start a match, team or tournament">
        <Plus size={18} aria-hidden />
        <span className="side-label">Start something</span>
      </button>

      <nav className="side-group" aria-label="Sections">
        {MAIN.map((n) => link(n, n.to === "/matches" ? liveCount : undefined))}
      </nav>

      <div className="side-group">
        <span className="side-heading">Sports</span>
        <button type="button" className={cx("side-link", !sport && "active-soft")} onClick={() => setSport("")} title="All sports">
          <LayoutGrid size={18} aria-hidden />
          <span className="side-label">All sports</span>
        </button>
        {SPORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cx("side-link", sport === s.id && "active-soft")}
            onClick={() => setSport(s.id)}
            title={s.name}
            aria-pressed={sport === s.id}
          >
            <s.icon size={18} aria-hidden style={{ color: sport === s.id ? s.colors[1] : undefined }} />
            <span className="side-label">{s.name}</span>
          </button>
        ))}
      </div>

      {teams.length > 0 && (
        <div className="side-group">
          <span className="side-heading">Your teams</span>
          {teams.slice(0, 6).map((t) => (
            <NavLink key={t.id} to={`/teams/${t.id}`} className={({ isActive }) => cx("side-link", isActive && "active")} title={t.name}>
              <Crest name={t.name} logo={t.logo} size={22} />
              <span className="side-label truncate">{t.name}</span>
            </NavLink>
          ))}
        </div>
      )}

      <div className="side-group">
        <span className="side-heading">Explore</span>
        {EXPLORE.map((n) => link(n))}
      </div>

      <div className="side-foot">
        {account ? (
          <div className="side-account">
            <Link to="/me" className="side-account-main" title="Your profile">
              <Avatar name={displayName(account)} size={34} />
              <span className="side-label stack" style={{ gap: 0, minWidth: 0 }}>
                <strong className="truncate small">{displayName(account)}</strong>
                <span className="faint tiny truncate">{account.email}</span>
              </span>
            </Link>
            <Link to="/settings" className="icon-btn side-label" aria-label="Settings" title="Settings"><Settings size={17} /></Link>
          </div>
        ) : (
          <Link to="/register" className="side-join">
            <strong className="side-label">Join PlayHere free</strong>
            <span className="side-label faint small">Score matches, run tournaments, keep your stats.</span>
            <UserRound size={18} aria-hidden className="side-join-icon" />
          </Link>
        )}
      </div>
    </aside>
  );
}

/** Global search: Enter opens results; Ctrl/⌘+K or "/" focuses it from anywhere. */
function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/search") setQ("");
  }, [location.pathname]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
    input.current?.blur();
  };

  return (
    <form className="appbar-search" role="search" onSubmit={submit}>
      <Search size={17} aria-hidden />
      <input
        ref={input}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search teams, players, tournaments"
        aria-label="Search PlayHere"
      />
      <kbd className="hide-mobile">Ctrl K</kbd>
    </form>
  );
}
