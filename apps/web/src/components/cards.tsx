import { seededColors } from "@playhere/brand";
import { CalendarDays, ChevronRight, Clock, Flag, MapPin, Medal, Trophy, UserCheck as HowToReg, Zap as Bolt } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";
import { away, ballLabel, matchContext, currentInnings, headline, home, inningsFor, isLegal, isWicket, playerPlace, playerSports, score, sideScore, stageLabel } from "@/domain/cricket";
import { isCricket, sportOf } from "@/domain/sports";
import { SportIcon } from "./sport";
import type { BallEvent, Innings, Match, Player, RankingEntry, Team, TeamRef, Tournament } from "@/domain/models";
import { fmt, parseDate } from "@/lib/format";
import { Avatar, Crest, Pill, StatusPill, cx } from "./ui";

// ------------------------------------------------------------------ matches

function HeroTeam({ match, team, innings, batting }: { match: Match; team: TeamRef; innings: Innings | null; batting: boolean }) {
  const points = sideScore(match, team.id);
  return (
    <div className="row">
      <Crest name={team.name} logo={team.logo} size={38} />
      <span className="grow truncate" style={{ fontWeight: 700, fontSize: 16 }}>
        {team.name} {batting && <span style={{ color: "#ffb27a" }} aria-label="batting">●</span>}
      </span>
      {points !== null ? (
        <span className="num" style={{ fontSize: 28 }}>{points}</span>
      ) : innings ? (
        <span className="row" style={{ "--gap": "6px" } as CSSProperties}>
          <span className="num" style={{ fontSize: 24 }}>{score(innings)}</span>
          <span className="faint small">({fmt.overs(innings.overs)})</span>
        </span>
      ) : (
        <span className="faint small">{isCricket(match.sportType) ? "Yet to bat" : ""}</span>
      )}
    </div>
  );
}

/** Big gradient scoreboard for live matches. */
export function LiveHeroCard({ match }: { match: Match }) {
  const cur = currentInnings(match);
  return (
    <Link to={`/matches/${match.id}`} className="card card-hero card-link stack" style={{ padding: 20, gap: 14 }}>
      <div className="row">
        <StatusPill status={match.status} />
        <span className="grow truncate small muted">{matchContext(match)}</span>
        <SportIcon sport={match.sportType} size={26} />
      </div>
      <HeroTeam match={match} team={home(match)} innings={inningsFor(match, home(match).id)} batting={cur?.battingTeamId === home(match).id} />
      <HeroTeam match={match} team={away(match)} innings={inningsFor(match, away(match).id)} batting={cur?.battingTeamId === away(match).id} />
      <div className="row" style={{ background: "rgba(255,255,255,.08)", borderRadius: 10, padding: "8px 12px" }}>
        <Bolt size={15} aria-hidden />
        <span className="grow truncate small" style={{ fontWeight: 700 }}>{headline(match)}</span>
        <ChevronRight size={16} aria-hidden />
      </div>
    </Link>
  );
}

function TeamLine({ match, team, won, dim }: { match: Match; team: TeamRef; won: boolean; dim: boolean }) {
  const innings = inningsFor(match, team.id);
  const points = sideScore(match, team.id);
  return (
    <div className="row" style={{ opacity: dim ? 0.55 : 1 }}>
      <Crest name={team.name} logo={team.logo} size={30} />
      <span className="grow truncate" style={{ fontWeight: 700 }}>
        {team.name} {won && <Trophy size={14} color="var(--warning)" aria-label="winner" style={{ verticalAlign: -2 }} />}
      </span>
      {points !== null ? (
        <span className="num" style={{ fontSize: 20 }}>{points}</span>
      ) : innings && (
        <span>
          <span className="num" style={{ fontSize: 18 }}>{score(innings)}</span>{" "}
          <span className="faint small">{fmt.overs(innings.overs)} ov</span>
        </span>
      )}
    </div>
  );
}

export function MatchCard({ match, showTournament = true }: { match: Match; showTournament?: boolean }) {
  const winner = match.winnerTeamId;
  const live = match.status === "LIVE";
  const Icon = match.status === "SCHEDULED" ? Clock : live ? Bolt : Flag;
  return (
    <Link to={`/matches/${match.id}`} className={cx("card card-link stack", live && "card-live")} style={{ gap: 10 }}>
      <div className="row">
        <SportIcon sport={match.sportType} size={22} />
        <span className="grow truncate faint small" style={{ fontWeight: 600 }}>
          {showTournament ? matchContext(match) : stageLabel(match)}
        </span>
        <StatusPill status={match.status} />
      </div>
      <TeamLine match={match} team={home(match)} won={winner === home(match).id} dim={!!winner && winner !== home(match).id} />
      <TeamLine match={match} team={away(match)} won={winner === away(match).id} dim={!!winner && winner !== away(match).id} />
      <div className="row small" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <Icon size={15} color={live ? "var(--live)" : "var(--text-3)"} aria-hidden />
        <span className="grow truncate" style={{ fontWeight: 600, color: live ? "var(--text)" : "var(--text-2)" }}>{headline(match)}</span>
        {match.location && (
          <span className="row faint truncate" style={{ "--gap": "3px", maxWidth: 140 } as CSSProperties}>
            <MapPin size={13} aria-hidden /> {match.location}
          </span>
        )}
      </div>
    </Link>
  );
}

/** Compact fixture tile for horizontal rows. */
export function FixtureCard({ match }: { match: Match }) {
  return (
    <Link to={`/matches/${match.id}`} className="card card-link stack" style={{ width: 240, flex: "none", gap: 10 }}>
      <span className="row" style={{ "--gap": "6px" } as CSSProperties}>
        <SportIcon sport={match.sportType} size={20} />
        <span className="truncate faint tiny" style={{ fontWeight: 700 }}>{match.tournamentName}</span>
      </span>
      <div className="row spread">
        <Crest name={home(match).name} logo={home(match).logo} size={38} />
        <span className="label" style={{ color: "var(--brand)", letterSpacing: "0.2em" }}>VS</span>
        <Crest name={away(match).name} logo={away(match).logo} size={38} />
      </div>
      <div className="row spread small" style={{ fontWeight: 700 }}>
        <span className="truncate">{home(match).name}</span>
        <span className="truncate" style={{ textAlign: "right" }}>{away(match).name}</span>
      </div>
      <div className="row small faint" style={{ background: "var(--surface-sunken)", borderRadius: 8, padding: "6px 10px", "--gap": "6px" } as CSSProperties}>
        <Clock size={14} color="var(--brand)" aria-hidden />
        <span className="truncate">{headline(match)}</span>
      </div>
    </Link>
  );
}

export function BallChip({ ball, size = 34 }: { ball: BallEvent; size?: number }) {
  const cls = isWicket(ball) ? "ball-w" : ball.runs === 6 ? "ball-6" : ball.runs === 4 ? "ball-4" : !isLegal(ball) || ball.extraType !== "NONE" ? "ball-x" : "";
  return (
    <span className={cx("ball", cls)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {ballLabel(ball)}
    </span>
  );
}

// ------------------------------------------------------------------ tournaments

export function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  const sport = sportOf(t.sportType);
  const [a, b] = seededColors(t.name);
  const SportGlyph = sport.icon;
  return (
    <Link to={`/tournaments/${t.id}`} className="card card-link" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ height: 84, background: `linear-gradient(135deg, ${a}, ${b})`, position: "relative", padding: 12, overflow: "hidden" }}>
        <SportGlyph size={110} color="rgba(255,255,255,.18)" style={{ position: "absolute", right: -14, bottom: -26 }} aria-hidden />
        <div className="row spread">
          <Pill tone="glass" icon={sport.icon}>{sport.name} · {t.tournamentType === "KNOCKOUT" ? "Knockout" : "League"}</Pill>
          {t.status === "LIVE" ? <Pill tone="live">LIVE</Pill> : t.status === "UPCOMING" ? <Pill tone="glass" icon={HowToReg}>Registrations open</Pill> : null}
        </div>
      </div>
      <div className="stack" style={{ padding: 16, gap: 6 }}>
        <h3 className="truncate">{t.name}</h3>
        <span className="row faint small" style={{ "--gap": "6px" } as CSSProperties}>
          <CalendarDays size={14} aria-hidden /> {fmt.dateRange(parseDate(t.startDate), parseDate(t.endDate))}
        </span>
        {t.location && (
          <span className="row faint small" style={{ "--gap": "6px" } as CSSProperties}>
            <MapPin size={14} aria-hidden /> {t.location}
          </span>
        )}
        <div className="row" style={{ "--gap": "20px", marginTop: 8 } as CSSProperties}>
          <Figure value={fmt.moneyCompact(t.prizePool)} label="Prize pool" />
          <Figure value={String(t.teamsCount)} label="Teams" />
          <Figure value={t.entryFee ? fmt.moneyCompact(t.entryFee) : "Free"} label="Entry" />
        </div>
      </div>
    </Link>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <span className="stack" style={{ "--gap": "0px" } as CSSProperties}>
      <span className="num" style={{ fontSize: 16 }}>{value}</span>
      <span className="faint tiny">{label}</span>
    </span>
  );
}

export function TournamentRow({ tournament: t, trailing }: { tournament: Tournament; trailing?: ReactNode }) {
  return (
    <Link to={`/tournaments/${t.id}`} className="card card-link row" style={{ padding: 12 }}>
      <span style={{ position: "relative" }}>
        <Crest name={t.name} size={46} />
        <span style={{ position: "absolute", right: -4, bottom: -4 }}><SportIcon sport={t.sportType} size={20} /></span>
      </span>
      <span className="grow stack" style={{ "--gap": "2px" } as CSSProperties}>
        <strong className="truncate">{t.name}</strong>
        <span className="faint small truncate">
          {sportOf(t.sportType).name} · {t.tournamentType === "KNOCKOUT" ? "Knockout" : "League"} · {fmt.dateRange(parseDate(t.startDate), parseDate(t.endDate))}
        </span>
      </span>
      {trailing ?? <StatusPill status={t.status} />}
    </Link>
  );
}

// ------------------------------------------------------------------ teams & players

export function TeamRow({ team, trailing }: { team: Team; trailing?: ReactNode }) {
  return (
    <Link to={`/teams/${team.id}`} className="card card-link row" style={{ padding: 12 }}>
      <span style={{ position: "relative" }}>
        <Crest name={team.name} logo={team.logo} size={46} />
        <span style={{ position: "absolute", right: -4, bottom: -4 }}><SportIcon sport={team.sportType} size={20} /></span>
      </span>
      <span className="grow stack" style={{ "--gap": "2px" } as CSSProperties}>
        <strong className="truncate">{team.name}</strong>
        <span className="faint small truncate">
          {sportOf(team.sportType).name} · {team.squadSize} {team.squadSize === 1 ? "player" : "players"}
          {team.village ? ` · ${team.village}` : ""}
        </span>
      </span>
      {trailing ?? (team.myRole === "TEAM_OWNER" ? <Pill tone="brand">Captain</Pill> : <ChevronRight size={18} className="faint" aria-hidden />)}
    </Link>
  );
}

export function PlayerRow({ player, trailing, onClick }: { player: Player; trailing?: ReactNode; onClick?: () => void }) {
  const place = playerPlace(player);
  const body = (
    <>
      <Avatar name={player.name} src={player.profilePhoto} size={44} />
      <span className="grow stack" style={{ "--gap": "2px" } as CSSProperties}>
        <strong className="truncate">{player.name}</strong>
        <span className="faint small truncate">{[playerSports(player), place].filter(Boolean).join(" · ")}</span>
      </span>
      {trailing ?? <ChevronRight size={18} className="faint" aria-hidden />}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="card card-link row" style={{ padding: 12, width: "100%", textAlign: "left" }} onClick={onClick}>
        {body}
      </button>
    );
  }
  return (
    <Link to={`/players/${player.id}`} className="card card-link row" style={{ padding: 12 }}>
      {body}
    </Link>
  );
}

export function LeaderRow({ rank, entry }: { rank: number; entry: RankingEntry }) {
  const medal = ["#F5C451", "#C9D1E0", "#E59E6D"][rank - 1];
  const to =
    entry.kind === "PLAYER" && entry.id ? `/players/${entry.id}` : entry.kind === "TEAM" && entry.id ? `/teams/${entry.id}` : entry.teamId ? `/teams/${entry.teamId}` : null;
  const body = (
    <>
      <span style={{ width: 28, textAlign: "center" }}>
        {medal ? <Medal size={22} color={medal} aria-label={`Rank ${rank}`} /> : <span className="num faint">{rank}</span>}
      </span>
      {entry.kind === "TEAM" ? <Crest name={entry.name} logo={entry.logo} size={40} /> : <Avatar name={entry.name} size={40} />}
      <span className="grow stack" style={{ "--gap": "2px" } as CSSProperties}>
        <strong className="truncate">{entry.name}</strong>
        <span className="faint small truncate">{entry.detail}</span>
      </span>
      <span className="num" style={{ fontSize: 20, color: rank <= 3 ? "var(--brand)" : undefined }}>
        {entry.decimal ? Number(entry.value).toFixed(2) : Number(entry.value).toFixed(0)}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className="card card-link row" style={{ padding: 12 }}>{body}</Link>
  ) : (
    <div className="card row" style={{ padding: 12 }}>{body}</div>
  );
}
