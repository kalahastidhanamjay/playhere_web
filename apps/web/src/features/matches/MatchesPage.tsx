import { CalendarCheck, Flag, Radio, Users } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { MatchCard } from "@/components/cards";
import { Segmented } from "@/components/forms";
import { SportFilter, useSportFilter } from "@/components/sport";
import { ButtonLink, Empty, PageHeader, Pill, QueryView, SkeletonList } from "@/components/ui";
import { useLiveMatches, useMyMatches, useRecentResults, useUpcomingMatches } from "@/data/matches";
import { useSession } from "@/lib/session";

type Tab = "live" | "upcoming" | "results" | "mine";

export default function MatchesPage() {
  const { account } = useSession();
  const [tab, setTab] = useState<Tab>("live");
  const [sport, setSport] = useSportFilter();
  const live = useLiveMatches(sport);
  const upcoming = useUpcomingMatches(sport);
  const results = useRecentResults(sport);
  const mine = useMyMatches();
  const query = { live, upcoming, results, mine }[tab];
  const liveCount = live.data?.length ?? 0;

  const empty = {
    live: <Empty icon={Radio} title="Nothing live right now" message="Live matches appear here the moment play starts." action={<ButtonLink to="/quick-match" variant="secondary">Start a quick match</ButtonLink>} />,
    upcoming: <Empty icon={CalendarCheck} title="No fixtures scheduled" message="Fixtures show up once organisers draw them." action={<ButtonLink to="/tournaments/new" variant="secondary">Host a tournament</ButtonLink>} />,
    results: <Empty icon={Flag} title="No results yet" message="Completed matches and their results are listed here." />,
    mine: <Empty icon={Users} title="No matches for your teams" message="When a team you're in has fixtures, they show up here." action={<ButtonLink to="/teams/new" variant="secondary">Create a team</ButtonLink>} />,
  }[tab];

  return (
    <div className="page">
      <PageHeader
        title="Matches"
        actions={
          <>
            {liveCount > 0 && <Pill tone="live">{liveCount} LIVE</Pill>}
            <Link to="/leaderboard" className="btn btn-secondary btn-sm">Rankings</Link>
          </>
        }
      />
      <div className="stack" style={{ gap: 14 }}>
        <div className="filter-compact"><SportFilter value={sport} onChange={setSport} /></div>
        <Segmented<Tab>
          label="Match lists"
          value={tab}
          onChange={setTab}
          options={[
            { value: "live", label: "Live" },
            { value: "upcoming", label: "Upcoming" },
            { value: "results", label: "Results" },
            ...(account ? [{ value: "mine" as const, label: "Mine" }] : []),
          ]}
        />
        <QueryView query={query} loading={<SkeletonList height={150} />}>
          {(all) => {
            const matches = sport ? all.filter((m) => (m.sportType ?? "CRICKET") === sport) : all;
            return matches.length === 0 ? (
              empty
            ) : (
              <div className="grid" style={{ "--min": "340px" } as CSSProperties}>
                {matches.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            );
          }}
        </QueryView>
      </div>
    </div>
  );
}
