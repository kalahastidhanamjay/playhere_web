import { Search, SearchX } from "lucide-react";
import { useDeferredValue, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router";
import { PlayerRow, TeamRow, TournamentRow } from "@/components/cards";
import { Empty, ErrorView, PageHeader, SkeletonList } from "@/components/ui";
import { useSearch } from "@/data/players";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const fromUrl = params.get("q") ?? "";
  const [lastUrl, setLastUrl] = useState(fromUrl);
  if (fromUrl !== lastUrl) {
    // The top-bar search changed the query; adopt it.
    setLastUrl(fromUrl);
    setQ(fromUrl);
  }
  const deferred = useDeferredValue(q);
  const results = useSearch(deferred);
  const ready = deferred.trim().length >= 2;

  return (
    <div className="page page-mid">
      <PageHeader back title="Search" subtitle="Tournaments, teams and players" />
      <div className="input-wrap" style={{ marginBottom: 20 }}>
        <Search size={18} aria-hidden />
        <input
          className="input"
          type="search"
          autoFocus
          placeholder="Search PlayHere"
          aria-label="Search PlayHere"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLastUrl(e.target.value);
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
          }}
        />
      </div>
      {!ready ? (
        <Empty icon={Search} title="Find anything" message="Type at least 2 letters to search tournaments, teams and players." />
      ) : results.isError ? (
        <ErrorView error={results.error} onRetry={() => void results.refetch()} />
      ) : !results.data ? (
        <SkeletonList height={70} />
      ) : results.data.tournaments.length + results.data.teams.length + results.data.players.length === 0 ? (
        <Empty icon={SearchX} title="No results" message={`Nothing matches "${deferred.trim()}". Try a different spelling.`} />
      ) : (
        <div className="stack" style={{ gap: 24, opacity: results.isFetching ? 0.7 : 1 } as CSSProperties}>
          {results.data.tournaments.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="label">Tournaments</span>
              {results.data.tournaments.map((t) => <TournamentRow key={t.id} tournament={t} />)}
            </div>
          )}
          {results.data.teams.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="label">Teams</span>
              {results.data.teams.map((t) => <TeamRow key={t.id} team={t} />)}
            </div>
          )}
          {results.data.players.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="label">Players</span>
              {results.data.players.map((p) => <PlayerRow key={p.id} player={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
