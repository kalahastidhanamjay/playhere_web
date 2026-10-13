import { CalendarDays, MapPin, PenLine as Scoreboard, Shield, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { useParams, useSearchParams } from "react-router";
import { BallChip } from "@/components/cards";
import { ButtonLink, Crest, Group, GroupRow, PageHeader, QueryView, Section, SkeletonList, StatusPill } from "@/components/ui";
import { useMatchCenter, useScorecard } from "@/data/matches";
import { Tabs } from "@/components/forms";
import { AwardsSection } from "./Awards";
import { Scorecard } from "./Scorecard";
import { SportTag } from "@/components/sport";
import { away, canScore, chase, formatLabel, matchContext, groupByOver, headline, home, inningsFor, periodName, score, sideScore, sortedInnings, stageLabel, teamById, thisOver } from "@/domain/cricket";
import type { Innings, Match, TeamRef } from "@/domain/models";
import { isCricket, sportOf } from "@/domain/sports";
import { PeriodTable, Timeline } from "./PointsScorer";
import { fmt, parseDate } from "@/lib/format";
import { useUserId } from "@/lib/session";

export default function MatchCenterPage() {
  const { id = "" } = useParams();
  const query = useMatchCenter(id);
  const userId = useUserId();
  // The tab lives in the URL so a scorecard link can be shared (…/matches/:id?tab=scorecard).
  const [params, setParams] = useSearchParams();
  const tab: "summary" | "scorecard" = params.get("tab") === "scorecard" ? "scorecard" : "summary";
  const setTab = (t: "summary" | "scorecard") => setParams(t === "scorecard" ? { tab: t } : {}, { replace: true });
  return (
    <div className="page">
      <QueryView query={query} loading={<SkeletonList count={3} height={180} />}>
        {({ match, focus, balls, points }) => {
          const cricket = isCricket(match.sportType);
          const ch = chase(match, focus);
          const scorer = canScore(match, userId) && match.status !== "COMPLETED";
          const over = thisOver(balls);
          return (
            <>
              <PageHeader
                title={`${home(match).name} vs ${away(match).name}`}
                subtitle={matchContext(match)}
                crumbs={
                  match.tournamentId
                    ? [{ label: "Home", to: "/" }, { label: "Tournaments", to: "/tournaments" }, { label: match.tournamentName, to: `/tournaments/${match.tournamentId}` }]
                    : [{ label: "Home", to: "/" }, { label: "Matches", to: "/matches" }]
                }
              />
              <div className="layout-rail">
                <div className="stack" style={{ gap: 0 }}>
              <div className="card card-hero stack" style={{ padding: 24, gap: 20 }}>
                <div className="row spread">
                  <StatusPill status={match.status} />
                  <span className="row small muted" style={{ "--gap": "8px" } as CSSProperties}>
                    {!cricket && match.status === "LIVE" ? periodName(match) : stageLabel(match)}
                    <SportTag sport={match.sportType} />
                  </span>
                </div>
                <div className="row row-top" style={{ position: "relative", zIndex: 1 }}>
                  <Side match={match} team={home(match)} innings={inningsFor(match, home(match).id)} winner={match.winnerTeamId === home(match).id} />
                  <span className="label" style={{ color: "rgba(255,255,255,.4)", letterSpacing: "0.3em", marginTop: 22 }}>VS</span>
                  <Side match={match} team={away(match)} innings={inningsFor(match, away(match).id)} winner={match.winnerTeamId === away(match).id} />
                </div>
                <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 14, padding: "12px 16px", textAlign: "center", fontWeight: 700 }}>
                  {headline(match)}
                </div>
                {match.status === "LIVE" && focus && (
                  <div className="grid-4" style={{ gridTemplateColumns: "repeat(3, 1fr)", textAlign: "center" }}>
                    <Metric label="Run rate" value={fmt.runRate(focus.runs, focus.overs)} />
                    <Metric label="Overs" value={`${fmt.overs(focus.overs)}${match.oversPerSide ? ` / ${match.oversPerSide}` : ""}`} />
                    {ch && ch.need > 0 ? (
                      <Metric label="Req. rate" value={ch.ballsLeft > 0 ? ((ch.need * 6) / ch.ballsLeft).toFixed(2) : "—"} />
                    ) : (
                      <Metric label="Wickets" value={String(focus.wickets)} />
                    )}
                  </div>
                )}
              </div>

              {scorer && (
                <div style={{ marginTop: 16 }}>
                  <ButtonLink to={`/matches/${match.id}/score`} block size="lg" icon={Scoreboard}>
                    {match.status === "SCHEDULED" ? "Start scoring" : "Open scorer console"}
                  </ButtonLink>
                </div>
              )}

              {!cricket && match.periods && match.periods.length > 0 && (
                <Section title={sportOf(match.sportType).scoring === "SETS" ? `${sportOf(match.sportType).period} scores` : "Scoreline"} subtitle={formatLabel(match)}>
                  <PeriodTable match={match} rows={match.periods} />
                </Section>
              )}

              {!cricket && points.length > 0 && (
                <Section title="Match events">
                  <Timeline match={match} points={points} />
                </Section>
              )}

              {cricket && (
                <div style={{ marginTop: 24 }}>
                  <Tabs<"summary" | "scorecard">
                    value={tab}
                    onChange={setTab}
                    tabs={[{ value: "summary", label: "Summary" }, { value: "scorecard", label: "Scorecard" }]}
                  />
                </div>
              )}
              {cricket && tab === "scorecard" ? (
                <div style={{ marginTop: 20 }}>
                  <ScorecardTab id={match.id} live={match.status === "LIVE"} />
                </div>
              ) : (
                <>
                  {cricket && match.status === "COMPLETED" && <AwardsSection matchId={match.id} canEdit={canScore(match, userId)} />}
              {over.length > 0 && (
                <Section title="This over">
                  <div className="row wrap" style={{ "--gap": "8px" } as CSSProperties}>
                    {over.map((b) => <BallChip key={b.id} ball={b} size={40} />)}
                  </div>
                </Section>
              )}

              {match.innings.length > 0 && (
                <Section title="Innings">
                  <div className="stack" style={{ gap: 8 }}>
                    {sortedInnings(match).map((i) => <InningsRow key={i.id} team={teamById(match, i.battingTeamId)} innings={i} />)}
                  </div>
                </Section>
              )}

              {balls.length > 0 && (
                <Section title="Ball by ball" subtitle={focus ? `Innings ${focus.inningsNo}` : undefined}>
                  <div className="stack" style={{ gap: 8 }}>
                    {[...groupByOver(balls).entries()].reverse().map(([n, list]) => (
                      <div key={n} className="card row" style={{ padding: 12 }}>
                        <span className="stack" style={{ width: 70, gap: 0 }}>
                          <strong className="small">Over {n + 1}</strong>
                          <span className="faint tiny">{list.reduce((s, b) => s + b.runs + b.extras, 0)} runs</span>
                        </span>
                        <span className="row wrap grow" style={{ "--gap": "6px" } as CSSProperties}>
                          {list.map((b) => <BallChip key={b.id} ball={b} size={30} />)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

                </>
              )}
                </div>
                <aside className="rail">
              <Section title="Match info">
                <Group>
                  {match.tournamentId && <GroupRow icon={Trophy} title={match.tournamentName} subtitle={stageLabel(match)} to={`/tournaments/${match.tournamentId}`} />}
                  <GroupRow icon={CalendarDays} title={fmt.matchTime(parseDate(match.matchDate))} subtitle="Start time" />
                  {match.location && <GroupRow icon={MapPin} title={match.location} subtitle="Venue" />}
                  <GroupRow icon={Shield} title={home(match).name} subtitle="Home side" to={home(match).id ? `/teams/${home(match).id}` : undefined} />
                  <GroupRow icon={Shield} title={away(match).name} subtitle="Away side" to={away(match).id ? `/teams/${away(match).id}` : undefined} />
                </Group>
              </Section>
                </aside>
              </div>
            </>
          );
        }}
      </QueryView>
    </div>
  );
}

function ScorecardTab({ id, live }: { id: string; live: boolean }) {
  const query = useScorecard(id, true, live);
  return (
    <QueryView query={query} loading={<SkeletonList count={2} height={220} />}>
      {(data) => <Scorecard data={data} live={live} />}
    </QueryView>
  );
}

function Side({ match, team, innings, winner }: { match: Match; team: TeamRef; innings: Innings | null; winner: boolean }) {
  const points = sideScore(match, team.id);
  return (
    <div className="grow stack" style={{ alignItems: "center", textAlign: "center", gap: 8 }}>
      <span style={{ position: "relative" }}>
        <Crest name={team.name} logo={team.logo} size={64} />
        {winner && (
          <span style={{ position: "absolute", top: -8, right: -10, background: "var(--ph-gold)", borderRadius: "50%", width: 26, height: 26, display: "grid", placeItems: "center" }}>
            <Trophy size={14} color="#fff" aria-label="Winner" />
          </span>
        )}
      </span>
      <strong>{team.name}</strong>
      {points !== null ? (
        <span className="num" style={{ fontSize: 48, lineHeight: 1 }}>{points}</span>
      ) : innings ? (
        <>
          <span className="num" style={{ fontSize: 36, lineHeight: 1 }}>{score(innings)}</span>
          <span className="faint small">{fmt.overs(innings.overs)} overs</span>
        </>
      ) : (
        <span className="num faint" style={{ fontSize: 36, lineHeight: 1 }}>—</span>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="stack" style={{ gap: 0 }}>
      <span className="num" style={{ fontSize: 18 }}>{value}</span>
      <span className="faint tiny">{label}</span>
    </span>
  );
}

function InningsRow({ team, innings }: { team: TeamRef; innings: Innings }) {
  return (
    <div className="card row" style={{ padding: 12 }}>
      <Crest name={team.name} logo={team.logo} size={38} />
      <span className="grow stack" style={{ gap: 0 }}>
        <strong className="truncate">{team.name}</strong>
        <span className="faint small">Innings {innings.inningsNo} · RR {fmt.runRate(innings.runs, innings.overs)}</span>
      </span>
      <span className="stack" style={{ alignItems: "flex-end", gap: 0 }}>
        <span className="num" style={{ fontSize: 20 }}>{score(innings)}</span>
        <span className="faint small">{fmt.overs(innings.overs)} ov</span>
      </span>
      {!innings.completed && <span className="live-dot" style={{ color: "var(--live)" }} aria-label="In progress" />}
    </div>
  );
}
