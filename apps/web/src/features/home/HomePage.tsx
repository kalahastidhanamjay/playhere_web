import { ChevronRight, Moon, Plus, Trophy, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import { FixtureCard, LeaderRow, LiveHeroCard, MatchCard, TournamentCard } from "@/components/cards";
import { Whistle } from "@/components/icons";
import { SportFilter, useSportFilter } from "@/components/sport";
import { ButtonLink, Crest, Empty, IconTile, Pill, Section, SeeAll, Skeleton, StatusPill } from "@/components/ui";
import { useLiveMatches, useMyMatches, useRecentResults, useUpcomingMatches } from "@/data/matches";
import { useRankings } from "@/data/players";
import { useDiscoverTournaments } from "@/data/tournaments";
import { away, canScore, firstName, headline, home, inningsFor, score, sideScore } from "@/domain/cricket";
import { sportOf } from "@/domain/sports";
import { parseDate } from "@/lib/format";
import { useSession } from "@/lib/session";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const { account } = useSession();
  const [sport, setSport] = useSportFilter();
  const s = sport ? sportOf(sport) : null;
  return (
    <div className="glow-bg">
      <div className="page">
        <header className="home-head">
          <div className="stack" style={{ gap: 4 }}>
            <span className="faint">{greeting()}{s ? ` · ${s.name}` : ""}</span>
            <h1>{account ? firstName(account) : "Every game, every sport, live."}</h1>
            {!account && <p className="muted">Cricket, football, kabaddi, badminton and more. Follow live matches anywhere, or sign in to score your own.</p>}
          </div>
        </header>
        <div className="filter-compact" style={{ marginTop: 12 }}>
          <SportFilter value={sport} onChange={setSport} />
        </div>
        <div className="layout-rail">
          <div className="stack" style={{ gap: 0 }}>
            {account && <NextMatch />}
            <LiveNow sport={sport} />
            <Upcoming sport={sport} />
            <OpenTournaments sport={sport} />
            <RecentResults sport={sport} />
          </div>
          <aside className="rail" aria-label="Shortcuts and rankings">
            <QuickActions />
            <TopScorers sport={sport} />
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Desktop side rail: the three things people start here. */
function QuickActions() {
  const { account } = useSession();
  const go = (to: string) => (account ? to : `/login?from=${encodeURIComponent(to)}`);
  const items: [string, string, string, typeof Whistle, [string, string]][] = [
    ["/quick-match", "Score a match", "Any sport, live in 30 seconds", Whistle, ["#FF9A4D", "#FF3D5A"]],
    ["/teams/new", "Create a team", "Invite your squad with a link", Users, ["#7C5CFF", "#4F46E5"]],
    ["/tournaments/new", "Host a tournament", "League or knockout, auto fixtures", Trophy, ["#22C3EE", "#2563EB"]],
  ];
  return (
    <section className="card stack" style={{ padding: 8, gap: 2, marginTop: 32 }}>
      <span className="label" style={{ padding: "8px 10px 4px" }}>Get started</span>
      {items.map(([to, title, body, Icon, colors]) => (
        <Link key={to} to={go(to)} className="quick-action">
          <IconTile icon={Icon} size={38} colors={colors} />
          <span className="grow stack" style={{ gap: 0 }}>
            <strong className="small">{title}</strong>
            <span className="faint tiny">{body}</span>
          </span>
          <ChevronRight size={16} className="faint" aria-hidden />
        </Link>
      ))}
    </section>
  );
}

function NextMatch() {
  const { account } = useSession();
  const mine = useMyMatches().data;
  if (!mine) return null;
  const upcoming = mine
    .filter((m) => m.status !== "COMPLETED")
    .sort((a, b) => (a.status === "LIVE" ? -1 : b.status === "LIVE" ? 1 : (parseDate(a.matchDate)?.getTime() ?? 9e15) - (parseDate(b.matchDate)?.getTime() ?? 9e15)));

  if (upcoming.length === 0) {
    return (
      <Link to="/quick-match" className="card card-link row" style={{ marginTop: 20, padding: 16 }}>
        <IconTile icon={Whistle} size={46} />
        <span className="grow stack" style={{ gap: 2 }}>
          <strong>Playing today?</strong>
          <span className="faint small">Start a quick match in any sport and score it live</span>
        </span>
        <ChevronRight size={18} className="faint" aria-hidden />
      </Link>
    );
  }

  const m = upcoming[0];
  return (
    <Section title={m.status === "LIVE" ? "Your match is live" : "Your next match"}>
      <div className="card card-hero stack" style={{ padding: 20, gap: 14 }}>
        <div className="row">
          <StatusPill status={m.status} />
          <span className="truncate small muted">{m.tournamentName} · {headline(m)}</span>
        </div>
        {[home(m), away(m)].map((t) => {
          const inn = inningsFor(m, t.id);
          const pts = sideScore(m, t.id);
          return (
            <div key={t.id} className="row">
              <Crest name={t.name} logo={t.logo} size={40} />
              <strong className="grow truncate" style={{ fontSize: 17 }}>{t.name}</strong>
              {pts !== null ? <span className="num" style={{ fontSize: 22 }}>{pts}</span> : inn && <span className="num" style={{ fontSize: 20 }}>{score(inn)}</span>}
            </div>
          );
        })}
        <div className="row wrap" style={{ position: "relative", zIndex: 1 }}>
          {canScore(m, account?.id) && <ButtonLink to={`/matches/${m.id}/score`}>{m.status === "LIVE" ? "Continue scoring" : "Start scoring"}</ButtonLink>}
          <ButtonLink to={`/matches/${m.id}`} variant="secondary">Match centre</ButtonLink>
        </div>
      </div>
    </Section>
  );
}

function LiveNow({ sport }: { sport: string }) {
  const live = useLiveMatches(sport);
  const name = sport ? sportOf(sport).name.toLowerCase() : "";
  return (
    <Section title={sport ? `Live ${name}` : "Live now"} action={live.data?.length ? <SeeAll to="/matches" label="All matches" /> : undefined}>
      {live.isPending ? (
        <Skeleton height={210} radius={28} />
      ) : live.data?.length ? (
        <div className="grid" style={{ "--min": "300px" } as CSSProperties}>
          {live.data.map((m) => <LiveHeroCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="card card-hero stack" style={{ padding: 28, gap: 12 }}>
          <span><Pill tone="accent" icon={Moon}>Quiet on the field</Pill></span>
          <h2 style={{ color: "#fff" }}>{sport ? `No ${name} live right now` : "Nothing live right now"}</h2>
          <p className="muted" style={{ maxWidth: 520 }}>Playing today? Start a quick match and score it live. Every goal, point and run counts toward your stats.</p>
          <div style={{ position: "relative", zIndex: 1 }}>
            <ButtonLink to="/quick-match" icon={Plus}>Start a quick match</ButtonLink>
          </div>
        </div>
      )}
    </Section>
  );
}

function Upcoming({ sport }: { sport: string }) {
  const upcoming = useUpcomingMatches(sport);
  if (upcoming.data && upcoming.data.length === 0) return null;
  return (
    <Section title="Upcoming fixtures" action={<SeeAll to="/matches" />}>
      <div className="row" style={{ overflowX: "auto", paddingBottom: 6, alignItems: "stretch" }}>
        {upcoming.data
          ? upcoming.data.slice(0, 10).map((m) => <FixtureCard key={m.id} match={m} />)
          : [0, 1, 2].map((i) => <Skeleton key={i} height={180} width={240} />)}
      </div>
    </Section>
  );
}

function OpenTournaments({ sport }: { sport: string }) {
  const tournaments = useDiscoverTournaments(sport);
  return (
    <Section title="Tournaments" subtitle="Open for registration and in progress" action={<SeeAll to="/tournaments" label="Explore" />}>
      {tournaments.data?.length === 0 ? (
        <div className="card">
          <Empty icon={Trophy} title="No tournaments yet" message="Be the first to host one." action={<ButtonLink to="/tournaments/new">Host a tournament</ButtonLink>} />
        </div>
      ) : (
        <div className="grid" style={{ "--min": "260px" } as CSSProperties}>
          {tournaments.data
            ? tournaments.data.slice(0, 4).map((t) => <TournamentCard key={t.id} tournament={t} />)
            : [0, 1].map((i) => <Skeleton key={i} height={240} />)}
        </div>
      )}
    </Section>
  );
}

function TopScorers({ sport }: { sport: string }) {
  const s = sportOf(sport || "CRICKET");
  const board = useRankings(s.id, undefined, 5);
  if (!board.data?.length) return null;
  return (
    <Section title={s.scoring === "INNINGS" ? "Top run-scorers" : "Top scorers"} subtitle={s.name} action={<SeeAll to="/leaderboard" label="Rankings" />}>
      <div className="stack" style={{ gap: 8 }}>
        {board.data.map((e, i) => <LeaderRow key={`${e.kind}-${e.id ?? e.name}-${e.teamId ?? ""}`} rank={i + 1} entry={e} />)}
      </div>
    </Section>
  );
}

function RecentResults({ sport }: { sport: string }) {
  const results = useRecentResults(sport);
  if (!results.data?.length) return null;
  return (
    <Section title="Recent results" action={<SeeAll to="/matches" />}>
      <div className="grid" style={{ "--min": "320px" } as CSSProperties}>
        {results.data.slice(0, 4).map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
    </Section>
  );
}
