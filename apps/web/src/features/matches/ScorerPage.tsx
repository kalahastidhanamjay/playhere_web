import { useQueryClient } from "@tanstack/react-query";
import { Dices, Flag, Play, Repeat, Trophy, Undo2 } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "react-router";
import { BallChip } from "@/components/cards";
import { Dialog, useAction, useFeedback } from "@/components/overlay";
import { Button, ButtonLink, Crest, Empty, ErrorView, IconTile, PageHeader, Pill, SkeletonList } from "@/components/ui";
import { matchApi, matchCenterKey, useMatchCenter } from "@/data/matches";
import { away, chase, currentInnings, headline, home, inningsFor, legalBalls, score, teamById, thisOver } from "@/domain/cricket";
import { WICKET_TYPES, type Match, type Player, type TeamRef } from "@/domain/models";
import { isCricket } from "@/domain/sports";
import { fmt, parseDate } from "@/lib/format";
import { teamApi, useSquad } from "@/data/teams";
import { batterFigures, bowlerFigures, dismissed, LineupPanel, missingRole, PlayerPickerDialog, type LineupRole } from "./Lineup";
import { PlayingSquadsStep } from "./PlayingSquads";
import { PointsScorer } from "./PointsScorer";

type Picker = { title: string; options: { value: number; label: string }[]; onPick: (n: number) => void } | null;

/** Live scoring for the match's scorer (friendly creator or tournament organiser): ball by ball for cricket, taps for other sports. */
export default function ScorerPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const center = useMatchCenter(id, { live: false });
  const { confirm } = useFeedback();
  const [run, busy] = useAction();
  const [picker, setPicker] = useState<Picker>(null);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [picking, setPicking] = useState<LineupRole | null>(null);
  const [runOutOpen, setRunOutOpen] = useState(false);
  // Catches, stumpings and run-outs ask for the fielder next.
  const [fielderFor, setFielderFor] = useState<{ type: string; out?: string; runs: number } | null>(null);
  const homeSquad = useSquad(center.data?.match.homeTeam?.id ?? "");
  const awaySquad = useSquad(center.data?.match.awayTeam?.id ?? "");

  const act = async (action: () => Promise<unknown>, success?: string) => {
    const ok = await run(action, success);
    await queryClient.invalidateQueries({ queryKey: matchCenterKey(id) });
    return ok;
  };

  if (center.isError) return <div className="page"><ErrorView error={center.error} onRetry={() => void center.refetch()} /></div>;
  if (!center.data) return <div className="page"><SkeletonList count={3} height={140} /></div>;

  const { match, balls } = center.data;
  const innings = currentInnings(match);
  const wrap = (body: ReactNode) => (
    <div className="page page-narrow">
      <PageHeader
        title="Scorer console"
        subtitle={`${home(match).name} vs ${away(match).name}`}
        crumbs={[{ label: "Home", to: "/" }, { label: "Matches", to: "/matches" }, { label: `${home(match).name} vs ${away(match).name}`, to: `/matches/${id}` }]}
        actions={<ButtonLink to={`/matches/${id}`} variant="secondary" size="sm">View match centre</ButtonLink>}
      />
      {body}
      <ResultDialog open={resultOpen} match={match} onClose={() => setResultOpen(false)} onPick={(winner) => { setResultOpen(false); void act(() => matchApi.complete(id, winner ?? undefined), "Result saved"); }} />
    </div>
  );

  if (match.status === "COMPLETED") {
    const last = match.innings.length ? [...match.innings].sort((a, b) => a.inningsNo - b.inningsNo)[match.innings.length - 1] : null;
    return wrap(
      <Empty
        icon={Trophy}
        title="Match completed"
        message={headline(match)}
        action={
          <div className="row wrap" style={{ justifyContent: "center" }}>
            <ButtonLink to={`/matches/${id}?tab=scorecard`}>View scorecard</ButtonLink>
            {last && (
              <Button
                variant="secondary"
                icon={Undo2}
                loading={busy}
                onClick={async () => {
                  if (await confirm({ title: "Undo the last ball?", message: "The match reopens so you can correct it.", confirmLabel: "Undo" })) {
                    await act(() => matchApi.undo(last.id), "Last ball removed");
                  }
                }}
              >
                Undo last ball
              </Button>
            )}
          </div>
        }
      />,
    );
  }

  const squadsByTeam: Record<string, Player[]> = { [home(match).id]: homeSquad.data ?? [], [away(match).id]: awaySquad.data ?? [] };
  const hasPlaying = (match.homePlaying?.length ?? 0) > 0 && (match.awayPlaying?.length ?? 0) > 0;
  // Cricket: pick who plays for each side before the toss (also for matches started without it).
  if (isCricket(match.sportType) && match.innings.length === 0 && (match.status === "SCHEDULED" || !hasPlaying)) {
    const scheduled = match.status === "SCHEDULED";
    // Wait for both squads so the ticks start from the full lists.
    if (!homeSquad.data || !awaySquad.data) return wrap(<SkeletonList count={2} height={220} />);
    return wrap(
      <PlayingSquadsStep
        match={match}
        squads={squadsByTeam}
        busy={busy}
        actionLabel={scheduled ? "Start match" : "Continue to the toss"}
        onAdd={async (teamId, name) => {
          const before = new Set((squadsByTeam[teamId] ?? []).map((p) => p.id));
          const squad = await teamApi.addGuest(teamId, name);
          queryClient.setQueryData(["team", teamId, "squad"], squad);
          return squad.find((p) => !before.has(p.id)) ?? null;
        }}
        onConfirm={(playing) =>
          void act(async () => {
            for (const [teamId, ids] of Object.entries(playing)) await matchApi.setPlaying(id, teamId, ids);
            if (scheduled) await matchApi.start(id);
          }, scheduled ? "Match is live" : undefined)
        }
      />,
    );
  }

  if (match.status === "SCHEDULED") {
    return wrap(
      <Stage icon={Play} title={`${home(match).name} vs ${away(match).name}`} message={`Scheduled for ${fmt.matchTime(parseDate(match.matchDate))}. Start when the players take the field.`}>
        <Button size="lg" block loading={busy} icon={Play} onClick={() => act(() => matchApi.start(id), "Match is live")}>Start match</Button>
      </Stage>,
    );
  }

  if (!isCricket(match.sportType)) {
    return wrap(<PointsScorer match={match} points={center.data.points} busy={busy} act={act} />);
  }

  if (!innings) {
    const list = match.innings;
    if (list.length === 0) {
      return wrap(
        <Stage icon={Dices} title="Who bats first?" message="Pick the side that won the toss and chose to bat, or was put in.">
          <div className="stack" style={{ gap: 10 }}>
            {([[home(match), away(match)], [away(match), home(match)]] as [TeamRef, TeamRef][]).map(([bat, bowl]) => (
              <button key={bat.id} type="button" className="card card-link row" style={{ width: "100%", textAlign: "left" }} disabled={busy}
                onClick={() => act(() => matchApi.openInnings(id, 1, bat.id, bowl.id))}>
                <Crest name={bat.name} logo={bat.logo} size={44} />
                <strong className="grow">{bat.name} bat first</strong>
              </button>
            ))}
          </div>
        </Stage>,
      );
    }
    if (list.length === 1) {
      const first = list[0];
      const batting = first.bowlingTeamId;
      return wrap(
        <Stage icon={Repeat} title="Innings break" message={`${teamById(match, batting).name} need ${first.runs + 1} runs to win.`}>
          <div className="stack">
            <Button size="lg" block loading={busy} icon={Play} onClick={() => act(() => matchApi.openInnings(id, 2, batting, first.battingTeamId))}>Start 2nd innings</Button>
            <Button variant="secondary" block onClick={() => setResultOpen(true)}>Finish match now</Button>
          </div>
        </Stage>,
      );
    }
    return wrap(
      <Stage icon={Flag} title="Both innings complete" message="Declare the result to finish the match.">
        <Button size="lg" block icon={Trophy} onClick={() => setResultOpen(true)}>Declare result</Button>
      </Stage>,
    );
  }

  const batting = teamById(match, innings.battingTeamId);
  const overs = match.oversPerSide;
  const ch = chase(match, innings);
  const allOut = innings.wickets >= 10;
  const oversDone = overs != null && legalBalls(innings) >= overs * 6;
  const targetReached = !!ch && ch.need <= 0;
  const over = thisOver(balls);

  const squads: Record<string, Player[]> = { [home(match).id]: homeSquad.data ?? [], [away(match).id]: awaySquad.data ?? [] };
  // The side's playing players when picked, otherwise its whole squad (older matches).
  const playingOf = (teamId: string) => {
    const ids = teamId === home(match).id ? match.homePlaying : match.awayPlaying;
    const squad = squads[teamId] ?? [];
    return ids?.length ? ids.map((pid) => squad.find((p) => p.id === pid)).filter(Boolean) as Player[] : squad;
  };
  const addMidMatch = async (teamId: string, name: string) => {
    const before = new Set((squads[teamId] ?? []).map((p) => p.id));
    const squad = await teamApi.addGuest(teamId, name);
    queryClient.setQueryData(["team", teamId, "squad"], squad);
    const added = squad.find((p) => !before.has(p.id));
    const ids = teamId === home(match).id ? match.homePlaying : match.awayPlaying;
    if (added && ids?.length) {
      await matchApi.setPlaying(id, teamId, [...ids, added.id]);
      await queryClient.invalidateQueries({ queryKey: matchCenterKey(id) });
    }
  };
  const nameOf = (pid: string) => Object.values(squads).flat().find((p) => p.id === pid)?.name ?? "Player";
  const ready = !missingRole(innings);
  // After every change, ask for whoever is needed next (openers, new batter, next bowler).
  const afterChange = async () => {
    const fresh = queryClient.getQueryData<{ match: Match }>(matchCenterKey(id));
    const open = fresh ? currentInnings(fresh.match) : null;
    setPicking(missingRole(open));
  };
  const ball = async (runs: number, extras = 0, extraType = "NONE", wicketType = "NONE", outPlayerId?: string, fielderId?: string) => {
    await act(() => matchApi.ball(innings.id, { runs, extras, extraType, wicketType, outPlayerId, fielderId }));
    await afterChange();
  };
  const role = picking ?? null;
  const pickTeamId = role === "bowler" ? innings.bowlingTeamId : innings.battingTeamId;
  const out = dismissed(balls);
  const previousBowler = !innings.bowlerId && balls.length ? balls[balls.length - 1].bowlerId : null;
  const unavailable = new Set<string>(
    role === "bowler"
      ? previousBowler ? [previousBowler] : []
      : [...out, ...(role !== "striker" && innings.strikerId ? [innings.strikerId] : []), ...(role !== "nonStriker" && innings.nonStrikerId ? [innings.nonStrikerId] : [])],
  );

  const keys: { label: string; cls?: string; onClick: () => void }[] = [
    ...[0, 1, 2, 3].map((r) => ({ label: String(r), onClick: () => ball(r) })),
    { label: "4", cls: "p4", onClick: () => ball(4) },
    { label: "6", cls: "p6", onClick: () => ball(6) },
    { label: "OUT", cls: "pw", onClick: () => setWicketOpen(true) },
    { label: "↶", onClick: () => act(() => matchApi.undo(innings.id), "Last ball removed") },
    { label: "WD", cls: "px", onClick: () => setPicker({ title: "Wide + runs", options: [0, 1, 2, 3, 4].map((n) => ({ value: n, label: n ? `Wd + ${n}` : "Wide" })), onPick: (n) => ball(0, 1 + n, "WIDE") }) },
    { label: "NB", cls: "px", onClick: () => setPicker({ title: "No ball + runs off the bat", options: [0, 1, 2, 3, 4, 6].map((n) => ({ value: n, label: n ? `Nb + ${n}` : "No ball" })), onPick: (n) => ball(n, 1, "NO_BALL") }) },
    { label: "BYE", cls: "px", onClick: () => setPicker({ title: "Byes", options: [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} bye${n > 1 ? "s" : ""}` })), onPick: (n) => ball(0, n, "BYE") }) },
    { label: "LB", cls: "px", onClick: () => setPicker({ title: "Leg byes", options: [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} leg bye${n > 1 ? "s" : ""}` })), onPick: (n) => ball(0, n, "LEG_BYE") }) },
  ];

  const endInnings = async () => {
    const ok = await confirm({
      title: `End innings ${innings.inningsNo}?`,
      message: `${batting.name} finish on ${score(innings)} (${fmt.overs(innings.overs)} ov).`,
      confirmLabel: "End innings",
    });
    if (ok) await act(() => matchApi.endInnings(innings.id));
  };

  return wrap(
    <div className="stack" style={{ gap: 16 }}>
      <div className="card card-hero stack" style={{ padding: 20, gap: 12 }}>
        <div className="row">
          <Crest name={batting.name} logo={batting.logo} size={36} />
          <strong className="grow truncate">{batting.name} · Innings {innings.inningsNo}</strong>
          <Pill tone="live">LIVE</Pill>
        </div>
        <div className="row" style={{ alignItems: "flex-end", position: "relative", zIndex: 1 }}>
          <span className="num" style={{ fontSize: 56, lineHeight: 1 }}>{score(innings)}</span>
          <span className="muted" style={{ paddingBottom: 8, fontWeight: 700 }}>{fmt.overs(innings.overs)}{overs ? ` / ${overs}` : ""} ov</span>
          <span className="grow" />
          <span className="muted" style={{ paddingBottom: 8, fontWeight: 700 }}>CRR {fmt.runRate(innings.runs, innings.overs)}</span>
        </div>
        {ch && <strong style={{ color: "#ffb27a" }}>{ch.need > 0 ? `Target ${ch.target} · need ${ch.need} from ${Math.max(ch.ballsLeft, 0)} balls` : "Target reached!"}</strong>}
      </div>

      {(targetReached || allOut || oversDone) && (
        <div className="card card-success stack">
          <strong>{targetReached ? `${batting.name} have reached the target` : allOut ? `${batting.name} are all out` : `All ${overs} overs bowled`}</strong>
          <Button onClick={targetReached || innings.inningsNo >= 2 ? () => setResultOpen(true) : endInnings} disabled={busy}>
            {targetReached || innings.inningsNo >= 2 ? "Finish match" : "End innings"}
          </Button>
        </div>
      )}

      <LineupPanel innings={innings} balls={balls} nameOf={nameOf} busy={busy} onPick={setPicking} />
      {!ready && <p className="small" style={{ color: "var(--warning)" }}>Pick the batters and the bowler to start scoring.</p>}

      <div className="stack" style={{ gap: 8 }}>
        <span className="label">This over</span>
        <div className="row wrap" style={{ "--gap": "6px", minHeight: 38 } as CSSProperties}>
          {over.length ? over.map((b) => <BallChip key={b.id} ball={b} size={38} />) : <span className="faint small">New over</span>}
        </div>
      </div>

      <div className="pad" aria-busy={busy}>
        {keys.map((k) => (
          <button key={k.label} type="button" className={k.cls} disabled={busy || (!ready && k.label !== "↶")} onClick={k.onClick} aria-label={k.label === "↶" ? "Undo last ball" : undefined}>
            {k.label === "↶" ? <Undo2 size={22} /> : k.label}
          </button>
        ))}
      </div>

      <div className="grid-2">
        <Button variant="secondary" onClick={endInnings} disabled={busy}>End innings</Button>
        <Button variant="secondary" onClick={() => setResultOpen(true)} disabled={busy}>Finish match</Button>
      </div>

      <Dialog open={!!picker} onClose={() => setPicker(null)} title={picker?.title}>
        <div className="chips">
          {picker?.options.map((o) => (
            <button key={o.value} type="button" className="chip" style={{ height: 46, padding: "0 18px" }} onClick={() => { picker.onPick(o.value); setPicker(null); }}>
              {o.label}
            </button>
          ))}
        </div>
      </Dialog>

      <Dialog open={runOutOpen} onClose={() => setRunOutOpen(false)} title="Who was run out?">
        <div className="stack" style={{ gap: 8 }}>
          {[innings.strikerId, innings.nonStrikerId].filter(Boolean).map((pid) => (
            <Button
              key={pid}
              variant="secondary"
              block
              onClick={() => {
                setRunOutOpen(false);
                setPicker({
                  title: "Runs completed before the run-out",
                  options: [0, 1, 2, 3].map((n) => ({ value: n, label: n === 1 ? "1 run" : `${n} runs` })),
                  onPick: (n) => setFielderFor({ type: "RUN_OUT", out: pid!, runs: n }),
                });
              }}
            >
              {nameOf(pid!)}
            </Button>
          ))}
        </div>
      </Dialog>

      <PlayerPickerDialog
        open={!!role}
        title={`Pick the ${role === "nonStriker" ? "non-striker" : role ?? ""}`}
        teamName={teamById(match, pickTeamId).name}
        squad={playingOf(pickTeamId)}
        unavailable={unavailable}
        reason={(p) => (out.has(p.id) ? "Out" : p.id === previousBowler ? "Bowled last over" : "Batting")}
        figures={(p) => {
          if (role === "bowler") {
            const f = bowlerFigures(balls, p.id);
            return f.overs === "0.0" && !f.runs ? "" : `${f.overs}-${f.runs}-${f.wickets}`;
          }
          const f = batterFigures(balls, p.id);
          return f.balls ? `${f.runs} (${f.balls})` : "";
        }}
        onClose={() => setPicking(null)}
        onPick={async (p) => {
          const r = role;
          setPicking(null);
          await act(() => matchApi.setLineup(innings.id, r === "striker" ? { strikerId: p.id } : r === "nonStriker" ? { nonStrikerId: p.id } : { bowlerId: p.id }));
          await afterChange();
        }}
        onAdd={(name) => addMidMatch(pickTeamId, name)}
      />

      <PlayerPickerDialog
        open={!!fielderFor}
        title={fielderFor?.type === "CAUGHT" ? "Who took the catch?" : fielderFor?.type === "STUMPED" ? "Who made the stumping?" : "Who ran them out? (close to skip)"}
        teamName={teamById(match, innings.bowlingTeamId).name}
        squad={playingOf(innings.bowlingTeamId)}
        unavailable={new Set()}
        reason={() => ""}
        figures={(p) => (p.id === innings.bowlerId ? (fielderFor?.type === "CAUGHT" ? "Bowler · c & b" : "Bowler") : "")}
        onClose={() => {
          // A run-out can be saved without a fielder; a catch or stumping cannot.
          const f = fielderFor;
          setFielderFor(null);
          if (f?.type === "RUN_OUT") void ball(f.runs, 0, "NONE", "RUN_OUT", f.out);
        }}
        onPick={(p) => {
          const f = fielderFor!;
          setFielderFor(null);
          void ball(f.runs, 0, "NONE", f.type, f.out, p.id);
        }}
        onAdd={(name) => addMidMatch(innings.bowlingTeamId, name)}
      />

      <Dialog open={wicketOpen} onClose={() => setWicketOpen(false)} title="How was the batter out?">
        <div className="chips">
          {WICKET_TYPES.map((w) => (
            <button key={w} type="button" className="chip" style={{ height: 46 }} onClick={() => {
                setWicketOpen(false);
                if (w === "RUN_OUT") setRunOutOpen(true);
                else if (w === "CAUGHT" || w === "STUMPED") setFielderFor({ type: w, runs: 0 });
                else void ball(0, 0, "NONE", w);
              }}>
              {fmt.label(w)}
            </button>
          ))}
        </div>
      </Dialog>
    </div>,
  );
}

function Stage({ icon, title, message, children }: { icon: Parameters<typeof IconTile>[0]["icon"]; title: string; message: string; children: ReactNode }) {
  return (
    <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 14, paddingTop: 24 }}>
      <IconTile icon={icon} size={72} />
      <h2 style={{ fontSize: 24 }}>{title}</h2>
      <p className="muted" style={{ maxWidth: 420 }}>{message}</p>
      <div style={{ width: "100%", marginTop: 12 }}>{children}</div>
    </div>
  );
}

function ResultDialog({ open, match, onClose, onPick }: { open: boolean; match: Match; onClose: () => void; onPick: (winner: string | null) => void }) {
  const a = inningsFor(match, home(match).id);
  const b = inningsFor(match, away(match).id);
  const suggested = a && b && a.runs !== b.runs ? (a.runs > b.runs ? home(match).id : away(match).id) : null;
  return (
    <Dialog open={open} onClose={onClose} title="Declare result">
      <div className="stack" style={{ gap: 10 }}>
        {[home(match), away(match)].map((t) => (
          <button key={t.id} type="button" className={`card card-link row ${suggested === t.id ? "card-brand" : ""}`} style={{ width: "100%", textAlign: "left" }} onClick={() => onPick(t.id)}>
            <Crest name={t.name} logo={t.logo} size={40} />
            <strong className="grow">{t.name} won</strong>
            {suggested === t.id && <Pill tone="brand">Suggested</Pill>}
          </button>
        ))}
        <Button variant="secondary" block onClick={() => onPick(null)}>Tie / no result</Button>
      </div>
    </Dialog>
  );
}
