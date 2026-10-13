import { seededColors } from "@playhere/brand";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CalendarRange as EventNote, Check, Copy, Hourglass, ShieldCheck, Table2, Users, X } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { MatchCard, LiveHeroCard, TeamRow } from "@/components/cards";
import { Tabs } from "@/components/forms";
import { Dialog, useAction, useFeedback } from "@/components/overlay";
import { Breadcrumbs, Button, ButtonLink, Crest, Empty, ErrorView, Pill, QueryView, Section, SkeletonList, StatTile, StatusPill } from "@/components/ui";
import { socialApi, useFollows } from "@/data/account";
import { useTournamentMatches } from "@/data/matches";
import { useOwnedTeams } from "@/data/teams";
import { tournamentApi, useRegistrations, useStandings, useTournament } from "@/data/tournaments";
import type { Registration, Team, Tournament } from "@/domain/models";
import { differenceLabel, sportOf } from "@/domain/sports";
import { fmt, parseDate } from "@/lib/format";
import { useSession } from "@/lib/session";

type Tab = "overview" | "fixtures" | "table" | "teams";

export default function TournamentPage() {
  const { id = "" } = useParams();
  const query = useTournament(id);
  if (query.isError) return <div className="page"><ErrorView error={query.error} onRetry={() => void query.refetch()} /></div>;
  if (!query.data) return <div className="page"><SkeletonList count={3} height={160} /></div>;
  return <TournamentView tournament={query.data} />;
}

function TournamentView({ tournament: t }: { tournament: Tournament }) {
  const { account } = useSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const isOrganizer = account?.id === t.organizerId;
  const [a, b] = seededColors(t.name);
  const dates = fmt.dateRange(parseDate(t.startDate), parseDate(t.endDate));
  const sport = sportOf(t.sportType);
  const SportGlyph = sport.icon;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tournament", t.id] });
    void queryClient.invalidateQueries({ queryKey: ["matches", "tournament", t.id] });
    void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
  };

  return (
    <div className="page">
      <Breadcrumbs current={t.name} />
      <div style={{ borderRadius: 28, padding: "28px 24px", background: `linear-gradient(135deg, ${a}, ${b})`, position: "relative", overflow: "hidden", color: "#fff" }}>
        <SportGlyph size={220} color="rgba(255,255,255,.16)" style={{ position: "absolute", right: -30, bottom: -40 }} aria-hidden />
        <div className="stack" style={{ gap: 10, position: "relative" }}>
          <div className="row spread">
            <span className="row" style={{ "--gap": "8px" } as CSSProperties}>
              <span style={{ background: "rgba(10,15,28,.6)", borderRadius: 999 }}><StatusPill status={t.status} /></span>
              <Pill tone="glass" icon={sport.icon}>{sport.name} · {t.tournamentType === "KNOCKOUT" ? "Knockout" : "League"}</Pill>
            </span>
            {account && <FollowButton tournamentId={t.id} />}
          </div>
          <h1 style={{ color: "#fff", fontSize: "clamp(28px, 5vw, 42px)" }}>{t.name}</h1>
          <p style={{ color: "rgba(255,255,255,.85)" }}>{[dates, t.location].filter(Boolean).join("  ·  ")}</p>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "fixtures", label: "Fixtures" },
            { value: "table", label: "Table" },
            { value: "teams", label: t.pendingCount && isOrganizer ? `Teams · ${t.pendingCount} new` : "Teams" },
          ]}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === "overview" && <Overview t={t} isOrganizer={isOrganizer} onChanged={refresh} goTo={setTab} />}
        {tab === "fixtures" && <Fixtures t={t} isOrganizer={isOrganizer} />}
        {tab === "table" && <TableTab id={t.id} sport={t.sportType} />}
        {tab === "teams" && <TeamsTab t={t} isOrganizer={isOrganizer} onChanged={refresh} />}
      </div>

      {t.status === "UPCOMING" && <RegisterBar t={t} isOrganizer={isOrganizer} onChanged={refresh} />}
    </div>
  );
}

function FollowButton({ tournamentId }: { tournamentId: string }) {
  const follows = useFollows();
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const following = follows.data?.some((f) => f.targetType === "TOURNAMENT" && f.targetId === tournamentId) ?? false;
  return (
    <button
      type="button"
      className="btn btn-sm"
      style={{ background: "rgba(10,15,28,.55)", color: "#fff" }}
      disabled={loading}
      onClick={async () => {
        await run(() => (following ? socialApi.unfollow("TOURNAMENT", tournamentId) : socialApi.follow("TOURNAMENT", tournamentId)), following ? "Unfollowed" : "You'll get updates for this tournament");
        void queryClient.invalidateQueries({ queryKey: ["follows"] });
      }}
    >
      {following ? <BellRing size={15} /> : <Bell size={15} />} {following ? "Following" : "Follow"}
    </button>
  );
}

function Overview({ t, isOrganizer, onChanged, goTo }: { t: Tournament; isOrganizer: boolean; onChanged: () => void; goTo: (tab: Tab) => void }) {
  const matches = useTournamentMatches(t.id).data ?? [];
  const live = matches.filter((m) => m.status === "LIVE");
  const played = matches.filter((m) => m.status === "COMPLETED").length;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid-4">
        <StatTile hot value={fmt.moneyCompact(t.prizePool)} label="Prize pool" />
        <StatTile value={t.entryFee ? fmt.money(t.entryFee) : "Free"} label="Entry fee" />
        <StatTile value={t.teamsCount} label="Teams in" />
        <StatTile value={`${played}/${matches.length}`} label="Matches played" />
      </div>
      {isOrganizer && <Checklist t={t} fixtures={matches.length} onChanged={onChanged} goTo={goTo} />}
      {live.length > 0 && (
        <Section title="Live now">
          <div className="stack">{live.map((m) => <LiveHeroCard key={m.id} match={m} />)}</div>
        </Section>
      )}
      <Section title="Format">
        <div className="card muted">
          {t.tournamentType === "KNOCKOUT"
            ? "Single-elimination knockout. Winners advance each round until the final; byes are assigned automatically."
            : "Round-robin league. Every team plays every other team once. 2 points for a win, 1 for a tie or no result; ties on points are split by net run rate."}
        </div>
      </Section>
    </div>
  );
}

/** Organiser's next steps, in order. */
function Checklist({ t, fixtures, onChanged, goTo }: { t: Tournament; fixtures: number; onChanged: () => void; goTo: (tab: Tab) => void }) {
  const { toast, confirm } = useFeedback();
  const [run, loading] = useAction();
  const open = t.status === "UPCOMING";

  const share = async () => {
    const text = `Register your team for ${t.name} (${fmt.dateRange(parseDate(t.startDate), parseDate(t.endDate))}${t.location ? `, ${t.location}` : ""}) on PlayHere: ${window.location.origin}/tournaments/${t.id}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("success", "Invite message copied. Paste it in your WhatsApp group.");
    } catch {
      toast("info", text);
    }
  };

  const generate = async () => {
    const ok = await confirm({
      title: "Generate fixtures?",
      message: `This closes registrations for ${t.teamsCount} approved teams, draws the ${t.tournamentType === "KNOCKOUT" ? "knockout" : "league"} schedule from ${fmt.date(parseDate(t.startDate))} and marks the tournament live.`,
      confirmLabel: "Generate",
    });
    if (ok && (await run(() => tournamentApi.generateFixtures(t.id), "Fixtures generated"))) onChanged();
  };

  const steps: { title: string; body: string; done: boolean; action?: { label: string; onClick: () => void } }[] = [
    { title: "Share with captains", body: "Send the invite link so team captains can register.", done: t.teamsCount + t.pendingCount > 0, action: open ? { label: "Copy invite", onClick: share } : undefined },
    {
      title: "Approve teams",
      body: t.pendingCount > 0 ? `${t.pendingCount} waiting for you · ${t.teamsCount} approved` : `${t.teamsCount} approved. New requests appear in the Teams tab.`,
      done: t.teamsCount >= 2 && t.pendingCount === 0,
      action: t.pendingCount > 0 ? { label: "Review", onClick: () => goTo("teams") } : undefined,
    },
    {
      title: "Generate fixtures",
      body: t.teamsCount < 2 ? "Needs at least 2 approved teams." : "Draws the schedule and starts the tournament.",
      done: !open,
      action: open && t.teamsCount >= 2 ? { label: "Generate", onClick: generate } : undefined,
    },
    { title: "Score matches", body: "Open a match from Fixtures and score it live.", done: false, action: !open && fixtures > 0 ? { label: "Fixtures", onClick: () => goTo("fixtures") } : undefined },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <div className="card card-brand stack" style={{ gap: 16 }}>
      <div className="row"><ShieldCheck size={19} color="var(--brand)" /><strong>Organiser checklist</strong></div>
      {steps.map((s, i) => (
        <div key={s.title} className="row row-top">
          <span
            style={{
              width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", flex: "none", fontWeight: 800, fontSize: 13,
              background: s.done ? "var(--success)" : i === current ? "var(--brand)" : "var(--surface-sunken)",
              color: s.done || i === current ? "#fff" : "var(--text-3)",
            }}
          >
            {s.done ? <Check size={16} /> : i + 1}
          </span>
          <span className="grow stack" style={{ gap: 2 }}>
            <strong style={{ color: s.done || i === current ? undefined : "var(--text-3)" }}>{s.title}</strong>
            <span className="faint small">{s.body}</span>
          </span>
          {s.action && (
            <Button size="sm" variant="tonal" loading={loading && s.title === "Generate fixtures"} onClick={s.action.onClick} icon={s.title === "Share with captains" ? Copy : undefined}>
              {s.action.label}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function Fixtures({ t, isOrganizer }: { t: Tournament; isOrganizer: boolean }) {
  const query = useTournamentMatches(t.id);
  return (
    <QueryView query={query} loading={<SkeletonList height={140} />}>
      {(list) =>
        list.length === 0 ? (
          <Empty icon={EventNote} title="No fixtures yet" message={isOrganizer ? "Approve at least 2 teams, then generate fixtures from the Overview tab." : "The organiser will publish the schedule once registrations close."} />
        ) : (
          <div className="grid" style={{ "--min": "340px" } as CSSProperties}>
            {list.map((m) => <MatchCard key={m.id} match={m} showTournament={false} />)}
          </div>
        )
      }
    </QueryView>
  );
}

function TableTab({ id, sport }: { id: string; sport: string }) {
  const query = useStandings(id);
  const s = sportOf(sport);
  const cricket = s.scoring === "INNINGS";
  return (
    <QueryView query={query}>
      {(rows) =>
        rows.length === 0 ? (
          <Empty icon={Table2} title="No standings yet" message="The points table fills in as approved teams play." />
        ) : (
          <div className="stack">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th><th>Team</th><th className="c">P</th><th className="c">W</th><th className="c">L</th><th className="c">T/NR</th><th className="c">{differenceLabel(s)}</th><th className="c">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.teamId} className={i < 2 ? "qualify" : undefined}>
                      <td className="num faint">{i + 1}</td>
                      <td>
                        <Link to={`/teams/${r.teamId}`} className="row" style={{ "--gap": "10px" } as CSSProperties}>
                          <Crest name={r.teamName} logo={r.teamLogo} size={28} />
                          <strong className="truncate">{r.teamName}</strong>
                        </Link>
                      </td>
                      <td className="c">{r.matchesPlayed}</td>
                      <td className="c">{r.won}</td>
                      <td className="c">{r.lost}</td>
                      <td className="c">{r.tied + r.noResult}</td>
                      <td className="c faint">{(r.netRunRate >= 0 ? "+" : "") + r.netRunRate.toFixed(cricket ? 3 : 0)}</td>
                      <td className="c num" style={{ color: "var(--brand)", fontSize: 16 }}>{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="row faint small" style={{ "--gap": "8px" } as CSSProperties}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--success)" }} /> Top two qualify
            </span>
          </div>
        )
      }
    </QueryView>
  );
}

function TeamsTab({ t, isOrganizer, onChanged }: { t: Tournament; isOrganizer: boolean; onChanged: () => void }) {
  const query = useRegistrations(t.id);
  const { confirm } = useFeedback();
  const [run] = useAction();

  const review = async (team: Team, approve: boolean) => {
    if (!approve && !(await confirm({ title: `Decline ${team.name}?`, message: "The captain will be told their registration was not accepted.", confirmLabel: "Decline", destructive: true }))) return;
    if (await run(() => tournamentApi.review(t.id, team.id, approve), approve ? `${team.name} is in` : `${team.name} declined`)) onChanged();
  };

  return (
    <QueryView query={query} loading={<SkeletonList height={72} />}>
      {(list) => {
        const pending = list.filter((r: Registration) => r.status === "PENDING");
        const active = list.filter((r: Registration) => r.status === "ACTIVE");
        if (!pending.length && !active.length) {
          return <Empty icon={Users} title="No teams yet" message={t.status === "UPCOMING" ? "Registrations are open. Be the first team in." : "No teams took part."} />;
        }
        return (
          <div className="stack" style={{ gap: 20 }}>
            {pending.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                <span className="label" style={{ color: "var(--warning)" }}>{isOrganizer ? "Waiting for your approval" : "Awaiting approval"} · {pending.length}</span>
                {pending.map(({ team }) => (
                  <div key={team.id} className="card card-warning row" style={{ padding: 12 }}>
                    <Crest name={team.name} logo={team.logo} size={44} />
                    <span className="grow stack" style={{ gap: 0 }}>
                      <strong className="truncate">{team.name}</strong>
                      <span className="faint small">{team.squadSize} players</span>
                    </span>
                    {isOrganizer ? (
                      <>
                        <button type="button" className="icon-btn" aria-label={`Decline ${team.name}`} onClick={() => review(team, false)}><X size={17} color="var(--danger)" /></button>
                        <Button size="sm" onClick={() => review(team, true)}>Approve</Button>
                      </>
                    ) : (
                      <Pill tone="warning">Pending</Pill>
                    )}
                  </div>
                ))}
              </div>
            )}
            {active.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                <span className="label">In the tournament · {active.length}</span>
                {active.map(({ team }) => <TeamRow key={team.id} team={team} />)}
              </div>
            )}
          </div>
        );
      }}
    </QueryView>
  );
}

/** Pinned registration action; always reflects where the viewer's teams stand. */
function RegisterBar({ t, isOrganizer, onChanged }: { t: Tournament; isOrganizer: boolean; onChanged: () => void }) {
  const { account } = useSession();
  const navigate = useNavigate();
  const owned = useOwnedTeams().data ?? [];
  const regs = useRegistrations(t.id).data ?? [];
  const [run, loading] = useAction();
  const [choosing, setChoosing] = useState(false);

  const statusOf = new Map(regs.map((r) => [r.team.id, r.status]));
  const sport = sportOf(t.sportType);
  const sameSport = owned.filter((team) => sportOf(team.sportType).id === sport.id);
  const eligible = sameSport.filter((team) => !statusOf.has(team.id) || statusOf.get(team.id) === "REJECTED");
  const pending = owned.filter((team) => statusOf.get(team.id) === "PENDING");
  const active = owned.filter((team) => statusOf.get(team.id) === "ACTIVE");

  const register = async (team: Team) => {
    setChoosing(false);
    const ok = await run(
      () => tournamentApi.register(t.id, team.id),
      isOrganizer ? `${team.name} registered. Approve it in the Teams tab.` : `Request sent. ${team.name} is in once the organiser approves.`,
    );
    if (ok) onChanged();
  };

  let headline: string;
  let detail: string;
  let action: ReactNode;
  if (!account) {
    headline = "Registrations open";
    detail = "Sign in to enter your team";
    action = <Button onClick={() => navigate(`/login?from=/tournaments/${t.id}`)}>Sign in</Button>;
  } else if (sameSport.length === 0) {
    headline = "Registrations open";
    detail = `Create a ${sport.name.toLowerCase()} team to take part`;
    action = <ButtonLink to="/teams/new">Create team</ButtonLink>;
  } else if (eligible.length > 0) {
    headline = eligible.length === 1 ? eligible[0].name : `${eligible.length} of your teams can enter`;
    detail = t.entryFee ? `Entry ${fmt.money(t.entryFee)} · organiser approves` : "Free entry · organiser approves";
    action = <Button loading={loading} onClick={() => (eligible.length === 1 ? register(eligible[0]) : setChoosing(true))}>Register my team</Button>;
  } else if (pending.length > 0) {
    headline = `${pending.map((p) => p.name).join(", ")} requested`;
    detail = "Waiting for the organiser to approve";
    action = <Pill tone="warning" icon={Hourglass}>Pending</Pill>;
  } else {
    headline = `${active.map((p) => p.name).join(", ")} ${active.length === 1 ? "is" : "are"} in`;
    detail = "Fixtures appear once the organiser draws them";
    action = <Pill tone="success" icon={Check}>Registered</Pill>;
  }

  return (
    <>
      <div className="action-bar">
        <span className="grow stack" style={{ gap: 0 }}>
          <strong className="truncate">{headline}</strong>
          <span className="faint small truncate">{detail}</span>
        </span>
        {action}
      </div>
      <Dialog open={choosing} onClose={() => setChoosing(false)} title="Register which team?">
        <div className="stack" style={{ gap: 8 }}>
          {eligible.map((team) => (
            <button key={team.id} type="button" className="card card-link row" style={{ width: "100%", textAlign: "left" }} onClick={() => register(team)}>
              <Crest name={team.name} logo={team.logo} size={40} />
              <strong className="grow">{team.name}</strong>
              <span className="faint small">{team.squadSize} players</span>
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}
