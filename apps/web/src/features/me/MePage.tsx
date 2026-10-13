import { BarChart3, Building2, Handshake, LineChart, Megaphone, PenLine, Settings, Users, Warehouse } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import { TeamRow } from "@/components/cards";
import { Avatar, ButtonLink, Group, GroupRow, PageHeader, Pill, Section, Skeleton } from "@/components/ui";
import { useOffers } from "@/data/account";
import { useMyPlayer, usePlayerStats, useWatchlist } from "@/data/players";
import { useMyTeams } from "@/data/teams";
import { SportIcon } from "@/components/sport";
import { displayName, playerPlace, playerSports, sportsOf } from "@/domain/cricket";
import { useSession } from "@/lib/session";
import { ThemePicker } from "./ThemePicker";

/** One profile: stats first, then teams; account settings sit behind the gear. */
export default function MePage() {
  const { account, status } = useSession();
  if (status === "loading") return <div className="page page-mid"><Skeleton height={220} /></div>;
  if (!account) return <Guest />;
  return (
    <div className="page page-mid">
      <PageHeader title="Me" actions={<Link to="/settings" className="icon-btn" aria-label="Settings"><Settings size={19} /></Link>} />
      <PlayerHero />
      <OffersBanner />
      <MyTeams />
      <Watchlist />
      <Section title="More">
        <Group>
          <GroupRow icon={Handshake} title="Contract offers" subtitle="Offers from teams" color="var(--success)" to="/offers" />
          <GroupRow icon={Megaphone} title="Trials & opportunities" subtitle="Academies and recruitment drives" color="var(--accent)" to="/opportunities" />
          <GroupRow icon={BarChart3} title="Rankings" subtitle="Leaders and top teams in every sport" color="var(--info)" to="/leaderboard" />
          <GroupRow icon={Warehouse} title="Grounds, courts & nets" color="var(--success)" to="/venues" />
          <GroupRow icon={Building2} title="Organisations" subtitle="Get verified as an organiser" color="var(--warning)" to="/organizations" />
        </Group>
      </Section>
    </div>
  );
}

function Guest() {
  return (
    <div className="page page-mid">
      <PageHeader title="Me" />
      <div className="card card-hero stack" style={{ padding: 28, gap: 12 }}>
        <h2 style={{ color: "#fff" }}>Your sporting life, in one place</h2>
        <p className="muted">Every match you play, in every sport, adds to your stats and badges. Join free to start counting.</p>
        <div className="row" style={{ position: "relative", zIndex: 1 }}>
          <ButtonLink to="/register">Join free</ButtonLink>
          <ButtonLink to="/login" variant="secondary">Sign in</ButtonLink>
        </div>
      </div>
      <div style={{ marginTop: 24 }}><ThemePicker /></div>
    </div>
  );
}

function PlayerHero() {
  const { account } = useSession();
  const player = useMyPlayer();
  const stats = usePlayerStats(player.data?.id).data;
  if (player.isPending) return <Skeleton height={200} radius={28} />;
  const p = player.data;
  if (!p) {
    return (
      <Link to="/onboarding" className="card card-hero card-link row" style={{ padding: 22 }}>
        <Avatar name={account ? displayName(account) : "?"} size={56} ring />
        <span className="grow stack" style={{ gap: 2 }}>
          <strong style={{ fontSize: 17 }}>{account ? displayName(account) : "Player"}</strong>
          <span className="muted small">Tell us how you play so your stats can start counting.</span>
        </span>
        <span className="btn btn-primary btn-sm" style={{ position: "relative", zIndex: 1 }}>Set up</span>
      </Link>
    );
  }
  const place = playerPlace(p);
  return (
    <div className="card card-hero stack" style={{ padding: 22, gap: 20 }}>
      <div className="row">
        <Avatar name={p.name} src={p.profilePhoto} size={64} ring />
        <span className="grow stack" style={{ gap: 2 }}>
          <strong className="truncate" style={{ fontSize: 20 }}>{p.name}</strong>
          <span className="muted small truncate">{[playerSports(p), place].filter(Boolean).join(" · ")}</span>
          {p.playerCode && <span className="faint tiny">{p.playerCode}</span>}
        </span>
      </div>
      <div className="row wrap" style={{ "--gap": "6px", position: "relative", zIndex: 1 } as CSSProperties}>
        {sportsOf(p).map((s) => <SportIcon key={s} sport={s} size={30} />)}
      </div>
      {sportsOf(p).includes("CRICKET") && <div className="grid-4" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        {[[stats?.matches ?? 0, "Matches"], [stats?.runs ?? 0, "Runs"], [stats?.wickets ?? 0, "Wickets"], [(stats?.strikeRate ?? 0).toFixed(0), "Strike rate"]].map(([v, l]) => (
          <span key={l} className="stack" style={{ gap: 0 }}>
            <span className="num" style={{ fontSize: 24 }}>{v}</span>
            <span className="faint tiny">{l}</span>
          </span>
        ))}
      </div>}
      <div className="grid-2" style={{ position: "relative", zIndex: 1 }}>
        <Link to={`/players/${p.id}`} className="btn btn-sm" style={{ background: "rgba(255,255,255,.1)", color: "#fff" }}><LineChart size={15} /> Full profile</Link>
        <Link to="/me/player" className="btn btn-sm" style={{ background: "rgba(255,255,255,.1)", color: "#fff" }}><PenLine size={15} /> Edit</Link>
      </div>
    </div>
  );
}

function OffersBanner() {
  const pending = useOffers().data?.filter((o) => o.status === "PENDING").length ?? 0;
  if (!pending) return null;
  return (
    <Link to="/offers" className="card card-success card-link row" style={{ marginTop: 12 }}>
      <Handshake size={20} color="var(--success)" />
      <strong className="grow">{pending} contract offer{pending > 1 ? "s" : ""} waiting for you</strong>
      <span className="link" style={{ color: "var(--success)" }}>Review</span>
    </Link>
  );
}

function MyTeams() {
  const teams = useMyTeams();
  return (
    <Section title="My teams" action={<Link to="/teams/new" className="link">New</Link>}>
      {teams.isPending ? (
        <Skeleton height={72} />
      ) : teams.data?.length ? (
        <div className="stack" style={{ gap: 8 }}>
          {teams.data.map((t) => (
            <TeamRow key={t.id} team={t} trailing={<Pill tone={t.myRole === "TEAM_OWNER" ? "brand" : "neutral"}>{t.myRole === "TEAM_OWNER" ? "Captain" : "Player"}</Pill>} />
          ))}
        </div>
      ) : (
        <div className="card stack">
          <span className="row" style={{ "--gap": "10px" } as CSSProperties}><Users size={18} className="faint" /><strong>You are not in a team yet</strong></span>
          <p className="faint small">Create one and share the invite link, or join with a code from your captain (＋ Start → Join with a code).</p>
          <div className="row"><ButtonLink to="/teams/new" size="sm">Create team</ButtonLink></div>
        </div>
      )}
    </Section>
  );
}

function Watchlist() {
  const players = useWatchlist().data ?? [];
  if (!players.length) return null;
  return (
    <Section title="Watchlist">
      <div className="row" style={{ overflowX: "auto", "--gap": "18px", paddingBottom: 4 } as CSSProperties}>
        {players.map((p) => (
          <Link key={p.id} to={`/players/${p.id}`} className="stack" style={{ alignItems: "center", gap: 6, width: 68, flex: "none" }}>
            <Avatar name={p.name} src={p.profilePhoto} size={56} />
            <span className="small truncate" style={{ maxWidth: 68, fontWeight: 600 }}>{p.name.split(" ")[0]}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

