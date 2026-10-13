import { Flag, SkipForward, Undo2, UserRound } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { TextInput } from "@/components/forms";
import { useFeedback } from "@/components/overlay";
import { SportIcon } from "@/components/sport";
import { Button, Crest, Pill } from "@/components/ui";
import { matchApi } from "@/data/matches";
import { away, headline, home, periodName, teamById } from "@/domain/cricket";
import type { Match, PeriodScore, PointEvent, TeamRef } from "@/domain/models";
import { sportOf } from "@/domain/sports";

interface Props {
  match: Match;
  points: PointEvent[];
  busy: boolean;
  act: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
}

/** Live scoring for goals, points and sets: one tap per score, plus period breaks. */
export function PointsScorer({ match, points, busy, act }: Props) {
  const { confirm } = useFeedback();
  const sport = sportOf(match.sportType);
  const [scorer, setScorer] = useState("");
  const period = match.currentPeriod ?? 1;
  const planned = match.plannedPeriods ?? sport.defaultPeriods;
  const sets = sport.scoring === "SETS";
  const current = match.periods?.find((p) => p.period === period) ?? { period, home: 0, away: 0 };
  const h = match.homeScore ?? 0;
  const a = match.awayScore ?? 0;
  const toWin = Math.floor(planned / 2) + 1;
  const decided = sets && (h >= toWin || a >= toWin);
  const lastPeriod = period >= planned;
  const periodWord = sport.period.toLowerCase();

  const score = (team: TeamRef, n: number, label: string) =>
    act(async () => {
      await matchApi.addPoints(match.id, team.id, n, label, scorer.trim());
      setScorer("");
    });

  const endPeriod = async () => {
    const ok = await confirm({
      title: `End ${periodName(match).toLowerCase()}?`,
      message: sets
        ? `${current.home}–${current.away}. ${current.home === current.away ? "A level " + periodWord + " counts for nobody." : `${teamById(match, current.home > current.away ? home(match).id : away(match).id).name} take it.`}`
        : `The score stays ${h}–${a}; the clock moves to ${sport.period.toLowerCase()} ${period + 1}.`,
      confirmLabel: `Start ${sport.period.toLowerCase()} ${period + 1}`,
    });
    if (ok) await act(() => matchApi.nextPeriod(match.id));
  };

  const finish = async () => {
    const ok = await confirm({
      title: "Finish the match?",
      message: sets
        ? "Finished " + periodWord + "s decide the result, including this one."
        : `Final score ${home(match).name} ${h}–${a} ${away(match).name}. A level score is a draw.`,
      confirmLabel: "Finish match",
    });
    if (ok) await act(() => matchApi.complete(match.id), "Result saved");
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card card-hero stack" style={{ padding: 20, gap: 14 }}>
        <div className="row">
          <SportIcon sport={sport} size={30} />
          <strong className="grow truncate">{sport.name} · {periodName(match)} of {planned}</strong>
          <Pill tone="live">LIVE</Pill>
        </div>
        <div className="row" style={{ position: "relative", zIndex: 1, alignItems: "center" }}>
          <HeroSide team={home(match)} value={sets ? current.home : h} />
          <span className="stack" style={{ alignItems: "center", gap: 2 }}>
            <span className="num" style={{ fontSize: 22, opacity: 0.6 }}>–</span>
            {sets && <span className="tiny" style={{ opacity: 0.75, fontWeight: 700 }}>{sport.period}s {h}–{a}</span>}
          </span>
          <HeroSide team={away(match)} value={sets ? current.away : a} />
        </div>
        <span className="small" style={{ textAlign: "center", fontWeight: 700, opacity: 0.85 }}>{headline(match)}</span>
      </div>

      {(decided || lastPeriod) && (
        <div className="card card-success row wrap">
          <strong className="grow">{decided ? `${(h > a ? home(match) : away(match)).name} have won enough ${periodWord}s` : `This is the last ${periodWord}`}</strong>
          <Button onClick={finish} disabled={busy}>Finish match</Button>
        </div>
      )}

      {sport.scoring === "GOALS" && (
        <TextInput icon={UserRound} placeholder="Who scored? (optional, added to the next goal)" value={scorer} onValue={setScorer} maxLength={60} />
      )}

      <div className="score-pad" aria-busy={busy}>
        {[home(match), away(match)].map((team) => (
          <div key={team.id} className="score-side">
            <div className="row" style={{ "--gap": "8px" } as CSSProperties}>
              <Crest name={team.name} logo={team.logo} size={30} />
              <strong className="grow truncate">{team.name}</strong>
            </div>
            {sport.scoreKeys.map((k) => (
              <button
                key={k.points}
                type="button"
                className="score-key"
                style={{ "--a": sport.colors[0], "--b": sport.colors[1] } as CSSProperties}
                disabled={busy}
                onClick={() => score(team, k.points, k.label)}
              >
                + {k.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Button variant="secondary" icon={Undo2} disabled={busy || points.length === 0} onClick={() => act(() => matchApi.undoPoints(match.id), "Last score removed")}>Undo</Button>
        <Button variant="secondary" icon={SkipForward} disabled={busy} onClick={endPeriod}>End {periodWord}</Button>
        <Button variant="secondary" icon={Flag} disabled={busy} onClick={finish}>Finish</Button>
      </div>

      {match.periods && match.periods.length > 0 && <PeriodTable match={match} rows={match.periods} />}
      {points.length > 0 && <Timeline match={match} points={points.slice(-8)} />}
    </div>
  );
}

function HeroSide({ team, value }: { team: TeamRef; value: number }) {
  return (
    <div className="grow stack" style={{ alignItems: "center", gap: 6, minWidth: 0 }}>
      <span className="truncate" style={{ fontWeight: 700, maxWidth: "100%" }}>{team.name}</span>
      <span className="num" style={{ fontSize: 60, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

/** Score per half, quarter or set. */
export function PeriodTable({ match, rows }: { match: Match; rows: PeriodScore[] }) {
  const sport = sportOf(match.sportType);
  return (
    <div className="card" style={{ padding: "8px 14px" }}>
      <table className="period-table">
        <thead>
          <tr>
            <th className="faint small">Team</th>
            {rows.map((r) => <th key={r.period} className="faint small">{sport.period[0]}{r.period}</th>)}
            <th className="small">{sport.scoring === "SETS" ? `${sport.period}s` : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          {[home(match), away(match)].map((t, i) => (
            <tr key={t.id}>
              <td className="truncate" style={{ fontWeight: 700, maxWidth: 140 }}>{t.name}</td>
              {rows.map((r) => {
                const mine = i === 0 ? r.home : r.away;
                const theirs = i === 0 ? r.away : r.home;
                return <td key={r.period} className="num" style={{ opacity: sport.scoring === "SETS" && mine < theirs ? 0.5 : 1 }}>{mine}</td>;
              })}
              <td className="num" style={{ color: "var(--brand)" }}>{(i === 0 ? match.homeScore : match.awayScore) ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Latest scoring events, newest first. */
export function Timeline({ match, points }: { match: Match; points: PointEvent[] }) {
  const sport = sportOf(match.sportType);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="label">Latest</span>
      {[...points].reverse().map((p) => {
        const team = teamById(match, p.teamId);
        return (
          <div key={p.id} className="card row" style={{ padding: "10px 12px" }}>
            <Crest name={team.name} logo={team.logo} size={28} />
            <span className="grow stack" style={{ gap: 0 }}>
              <strong className="small truncate">{p.playerName ? `${p.playerName} · ${team.name}` : team.name}</strong>
              <span className="faint tiny">{sport.period} {p.period}</span>
            </span>
            <span className="num" style={{ color: "var(--brand)" }}>+{p.points}</span>
            <span className="faint small" style={{ minWidth: 72, textAlign: "right" }}>{p.label ?? sport.unit}</span>
          </div>
        );
      })}
    </div>
  );
}
