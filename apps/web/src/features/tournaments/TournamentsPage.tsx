import { History, Lock, Plus, Radio, Trophy, UserCheck } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { TournamentCard, TournamentRow } from "@/components/cards";
import { Segmented } from "@/components/forms";
import { SportFilter, useSportFilter } from "@/components/sport";
import { ButtonLink, Empty, PageHeader, QueryView, SkeletonList, StatusPill } from "@/components/ui";
import { useMyTeams } from "@/data/teams";
import { useMyCompetitions, useTournaments } from "@/data/tournaments";
import { useSession } from "@/lib/session";

type Filter = "UPCOMING" | "LIVE" | "MINE" | "COMPLETED";

export default function TournamentsPage() {
  const { account } = useSession();
  const [filter, setFilter] = useState<Filter>("UPCOMING");
  const [sport, setSport] = useSportFilter();

  return (
    <div className="page">
      <PageHeader
        title="Tournaments"
        subtitle="Leagues and knockouts in every sport"
        actions={<ButtonLink to="/tournaments/new" size="sm" variant="tonal" icon={Plus}>Host</ButtonLink>}
      />
      <div className="stack" style={{ gap: 16 }}>
        <div className="filter-compact"><SportFilter value={sport} onChange={setSport} /></div>
        <Segmented<Filter>
          label="Tournament filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "UPCOMING", label: "Open" },
            { value: "LIVE", label: "Live" },
            { value: "MINE", label: "Mine" },
            { value: "COMPLETED", label: "Past" },
          ]}
        />
        {filter === "MINE" ? (
          account ? <Mine /> : <Empty icon={Lock} title="Sign in to see your tournaments" action={<ButtonLink to="/login?from=/tournaments">Sign in</ButtonLink>} />
        ) : (
          <List status={filter} sport={sport} />
        )}
      </div>
    </div>
  );
}

function List({ status, sport }: { status: Exclude<Filter, "MINE">; sport: string }) {
  const query = useTournaments(status);
  const empty = {
    UPCOMING: <Empty icon={UserCheck} title="No tournaments taking teams" message="Host one and share it with captains." action={<ButtonLink to="/tournaments/new">Host a tournament</ButtonLink>} />,
    LIVE: <Empty icon={Radio} title="Nothing in progress" message="Tournaments appear here once their fixtures are drawn." />,
    COMPLETED: <Empty icon={History} title="No finished tournaments yet" />,
  }[status];
  return (
    <QueryView query={query} loading={<SkeletonList count={3} height={230} />}>
      {(all) => {
        const items = sport ? all.filter((t) => (t.sportType ?? "CRICKET") === sport) : all;
        return items.length === 0 ? empty : (
          <div className="grid" style={{ "--min": "300px" } as CSSProperties}>
            {items.map((t) => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        );
      }}
    </QueryView>
  );
}

function Mine() {
  const teams = useMyTeams();
  const query = useMyCompetitions(teams.data);
  return (
    <QueryView query={query} loading={<SkeletonList height={76} />}>
      {(items) =>
        items.length === 0 ? (
          <Empty icon={Trophy} title="You are not in any tournament yet" message="Register your team in an open tournament, or host your own." action={<ButtonLink to="/tournaments/new">Host a tournament</ButtonLink>} />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {items.map(({ tournament, relation }) => (
              <TournamentRow
                key={tournament.id}
                tournament={tournament}
                trailing={
                  <span className="stack" style={{ alignItems: "flex-end", gap: 4 }}>
                    <StatusPill status={tournament.status} />
                    <span className="faint tiny truncate" style={{ maxWidth: 140 }}>{relation}</span>
                  </span>
                }
              />
            ))}
          </div>
        )
      }
    </QueryView>
  );
}
