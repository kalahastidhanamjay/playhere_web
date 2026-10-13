import { BarChart3 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { LeaderRow } from "@/components/cards";
import { Chips } from "@/components/forms";
import { useSportFilter } from "@/components/sport";
import { Empty, PageHeader, QueryView, SkeletonList } from "@/components/ui";
import { useRankingCategories, useRankings } from "@/data/players";
import { SPORTS, sportOf } from "@/domain/sports";

/** Rankings for every sport: cricket career leaders, top scorers, and the team table. */
export default function LeaderboardPage() {
  const [remembered, setRemembered] = useSportFilter();
  // Rankings are per sport; "all sports" falls back to cricket.
  const sport = sportOf(remembered || "CRICKET");
  const categories = useRankingCategories(sport.id).data ?? [];
  const [picked, setPicked] = useState<{ sport: string; category: string } | null>(null);
  const active = categories.find((c) => picked?.sport === sport.id && c.id === picked.category) ?? categories[0];
  const query = useRankings(sport.id, active?.id);

  const empty =
    active?.id === "TEAMS"
      ? `The table fills in as ${sport.name.toLowerCase()} matches are completed.`
      : active?.id === "SCORERS"
        ? "Add the scorer's name when you record a score and they'll appear here."
        : "Rankings appear once cricket matches are scored.";

  return (
    <div className="page page-mid">
      <PageHeader back title="Rankings" subtitle={`${sport.name} leaders across PlayHere`} />
      <div className="stack" style={{ gap: 14 }}>
        <div className="chips chips-scroll" role="group" aria-label="Sport">
          {SPORTS.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.id} type="button" className="chip" aria-pressed={s.id === sport.id} onClick={() => setRemembered(s.id)}>
                <Icon size={15} aria-hidden /> {s.name}
              </button>
            );
          })}
        </div>
        {categories.length > 0 && (
          <Chips
            scroll
            value={active?.id ?? ""}
            onChange={(category) => setPicked({ sport: sport.id, category })}
            options={categories.map((c) => ({ value: c.id, label: c.label }))}
          />
        )}
        <QueryView query={query} loading={<SkeletonList count={6} height={64} />}>
          {(rows) =>
            rows.length === 0 ? (
              <Empty icon={BarChart3} title="No rankings yet" message={empty} />
            ) : (
              <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
                {rows.map((r, i) => <LeaderRow key={`${r.kind}-${r.id ?? r.name}-${r.teamId ?? ""}`} rank={i + 1} entry={r} />)}
              </div>
            )
          }
        </QueryView>
      </div>
    </div>
  );
}
