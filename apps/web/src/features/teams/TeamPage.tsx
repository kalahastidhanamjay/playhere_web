import { seededColors } from "@playhere/brand";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarX, Copy, MapPin, Search, Share2, Trophy, UserMinus, UserPlus, UserRoundSearch, Users, X } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { MatchCard, PlayerRow, TournamentRow } from "@/components/cards";
import { Tabs, TextInput } from "@/components/forms";
import { Dialog, useAction, useFeedback } from "@/components/overlay";
import { Avatar, Breadcrumbs, Button, ButtonLink, Crest, Empty, ErrorView, Pill, QueryView, SkeletonList } from "@/components/ui";
import { useSearch } from "@/data/players";
import { teamApi, useInviteCode, useJoinRequests, useSquad, useTeam, useTeamMatches, useTeamTournaments } from "@/data/teams";
import { SportIcon, SportTag } from "@/components/sport";
import { roleLabel } from "@/domain/cricket";
import { isCricket } from "@/domain/sports";
import type { Player, Team } from "@/domain/models";
import { useSession } from "@/lib/session";

type Tab = "squad" | "fixtures" | "tournaments";

export default function TeamPage() {
  const { id = "" } = useParams();
  const query = useTeam(id);
  if (query.isError) return <div className="page"><ErrorView error={query.error} onRetry={() => void query.refetch()} /></div>;
  if (!query.data) return <div className="page"><SkeletonList count={4} height={90} /></div>;
  return <TeamView team={query.data} />;
}

function TeamView({ team }: { team: Team }) {
  const [tab, setTab] = useState<Tab>("squad");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const owner = team.myRole === "TEAM_OWNER";
  const member = !!team.myRole;
  const [a] = seededColors(team.name);

  return (
    <div className="page">
      <Breadcrumbs current={team.name} />
      <div className="stack" style={{ borderRadius: 28, marginBottom: 8, padding: "36px 20px 28px", alignItems: "center", textAlign: "center", gap: 10, background: `linear-gradient(180deg, color-mix(in srgb, ${a} 45%, transparent), transparent)` }}>
        <span style={{ position: "relative" }}>
          <Crest name={team.name} logo={team.logo} size={96} />
          <span style={{ position: "absolute", right: -8, bottom: -8 }}><SportIcon sport={team.sportType} size={36} /></span>
        </span>
        <h1>{team.name}</h1>
        <span className="row wrap faint small" style={{ justifyContent: "center", "--gap": "14px" } as CSSProperties}>
          <SportTag sport={team.sportType} />
          {team.village && <span className="row" style={{ "--gap": "4px" } as CSSProperties}><MapPin size={14} /> {team.village}</span>}
          <span className="row" style={{ "--gap": "4px" } as CSSProperties}><Users size={14} /> {team.squadSize} players</span>
          {owner && <Pill tone="brand">You captain this team</Pill>}
          {member && !owner && <Pill tone="success">You're in this squad</Pill>}
        </span>
        {owner && (
          <div className="row" style={{ marginTop: 6 }}>
            <Button icon={Share2} onClick={() => setInviteOpen(true)}>Invite players</Button>
            <Button variant="secondary" icon={UserPlus} onClick={() => setAddOpen(true)}>Add player</Button>
          </div>
        )}
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: "squad", label: "Squad" }, { value: "fixtures", label: "Fixtures" }, { value: "tournaments", label: "Tournaments" }]} />
      <div style={{ marginTop: 20 }}>
        {tab === "squad" && <Squad team={team} onInvite={() => setInviteOpen(true)} />}
        {tab === "fixtures" && <TeamFixtures id={team.id} />}
        {tab === "tournaments" && <TeamTournaments id={team.id} canJoin={owner} />}
      </div>

      {!member && <JoinBar team={team} />}
      {owner && <InviteDialog team={team} open={inviteOpen} onClose={() => setInviteOpen(false)} />}
      {owner && <AddPlayerDialog team={team} open={addOpen} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function Squad({ team, onInvite }: { team: Team; onInvite: () => void }) {
  const owner = team.myRole === "TEAM_OWNER";
  const squad = useSquad(team.id);
  const requests = useJoinRequests(team.id, owner).data ?? [];
  const queryClient = useQueryClient();
  const { confirm } = useFeedback();
  const [run] = useAction();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["team", team.id] });
    void queryClient.invalidateQueries({ queryKey: ["team", team.id, "squad"] });
  };

  const remove = async (p: Player) => {
    if (!(await confirm({ title: `Remove ${p.name}?`, message: `They will no longer be part of ${team.name}.`, confirmLabel: "Remove", destructive: true }))) return;
    if (await run(() => teamApi.removePlayer(team.id, p.id), `${p.name} removed`)) refresh();
  };

  const review = async (requestId: string, name: string, approve: boolean) => {
    if (await run(() => teamApi.reviewRequest(team.id, requestId, approve), approve ? `${name} joined ${team.name}` : "Request declined")) refresh();
  };

  return (
    <QueryView query={squad} loading={<SkeletonList height={70} />}>
      {(players) => {
        if (!players.length && !requests.length) {
          return (
            <Empty
              icon={UserRoundSearch}
              title="No players yet"
              message={owner ? "Share your invite link in the team group. Anyone who opens it joins instantly." : "This team hasn't announced its squad."}
              action={owner ? <Button onClick={onInvite} icon={Share2}>Invite players</Button> : undefined}
            />
          );
        }
        const byRole = new Map<string, Player[]>();
        // Cricket squads group by batting/bowling role; other sports by position.
        const group = (p: Player) => (isCricket(team.sportType) ? roleLabel(p.playerRole) : p.position || "Players");
        for (const p of players) byRole.set(group(p), [...(byRole.get(group(p)) ?? []), p]);
        return (
          <div className="stack" style={{ gap: 20 }}>
            {requests.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                <span className="label" style={{ color: "var(--warning)" }}>Want to join · {requests.length}</span>
                {requests.map((r) => (
                  <div key={r.id} className="card card-warning row" style={{ padding: 12 }}>
                    <Avatar name={r.name} size={42} />
                    <span className="grow stack" style={{ gap: 0 }}>
                      <strong className="truncate">{r.name}</strong>
                      <span className="faint small truncate">{[isCricket(team.sportType) ? roleLabel(r.playerRole) : null, r.place].filter(Boolean).join(" · ")}</span>
                    </span>
                    <button type="button" className="icon-btn" aria-label={`Decline ${r.name}`} onClick={() => review(r.id, r.name, false)}><X size={17} color="var(--danger)" /></button>
                    <Button size="sm" onClick={() => review(r.id, r.name, true)}>Accept</Button>
                  </div>
                ))}
              </div>
            )}
            {[...byRole.entries()].map(([role, list]) => (
              <div key={role} className="stack" style={{ gap: 8 }}>
                <span className="label">{role}s · {list.length}</span>
                {list.map((p) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    trailing={owner && p.id !== team.ownerId ? (
                      <button type="button" className="icon-btn" aria-label={`Remove ${p.name}`} onClick={(e) => { e.preventDefault(); void remove(p); }}>
                        <UserMinus size={17} color="var(--danger)" />
                      </button>
                    ) : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      }}
    </QueryView>
  );
}

function TeamFixtures({ id }: { id: string }) {
  const query = useTeamMatches(id);
  return (
    <QueryView query={query} loading={<SkeletonList height={140} />}>
      {(list) =>
        list.length === 0 ? (
          <Empty icon={CalendarX} title="No fixtures" message="Start a quick match or enter a tournament to get games." action={<ButtonLink to="/quick-match" variant="secondary">Quick match</ButtonLink>} />
        ) : (
          <div className="grid" style={{ "--min": "340px" } as CSSProperties}>
            {list.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )
      }
    </QueryView>
  );
}

function TeamTournaments({ id, canJoin }: { id: string; canJoin: boolean }) {
  const query = useTeamTournaments(id);
  return (
    <QueryView query={query} loading={<SkeletonList height={76} />}>
      {(list) =>
        list.length === 0 ? (
          <Empty
            icon={Trophy}
            title="No tournaments yet"
            message={canJoin ? "Find a tournament with open registrations and enter your team." : "Tournaments this team enters will appear here."}
            action={canJoin ? <ButtonLink to="/tournaments">Find a tournament</ButtonLink> : undefined}
          />
        ) : (
          <div className="stack" style={{ gap: 8 }}>{list.map((t) => <TournamentRow key={t.id} tournament={t} />)}</div>
        )
      }
    </QueryView>
  );
}

/** Pinned "Ask to join" for people outside the squad. */
function JoinBar({ team }: { team: Team }) {
  const { account } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["team", team.id] });
  const pending = team.myRequestStatus === "PENDING";

  let headline = `Play for ${team.name}?`;
  let detail = "The captain approves new players";
  let action: ReactNode = (
    <Button icon={UserPlus} loading={loading} onClick={async () => { if (await run(() => teamApi.requestToJoin(team.id), "Request sent to the captain")) refresh(); }}>
      Ask to join
    </Button>
  );
  if (!account) {
    detail = "Sign in to ask the captain";
    action = <Button onClick={() => navigate(`/login?from=/teams/${team.id}`)}>Sign in</Button>;
  } else if (pending) {
    headline = "Request sent";
    detail = "The captain will accept or decline";
    action = (
      <Button variant="secondary" loading={loading} onClick={async () => { if (await run(() => teamApi.cancelRequest(team.id), "Request withdrawn")) refresh(); }}>
        Withdraw
      </Button>
    );
  }
  return (
    <div className="action-bar">
      <span className="grow stack" style={{ gap: 0 }}>
        <strong className="truncate">{headline}</strong>
        <span className="faint small truncate">{detail}</span>
      </span>
      {action}
    </div>
  );
}

function InviteDialog({ team, open, onClose }: { team: Team; open: boolean; onClose: () => void }) {
  const code = useInviteCode(team.id, open);
  const { toast } = useFeedback();
  const link = code.data ? `${window.location.origin}/join/${code.data}` : "";
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", `${what} copied`);
    } catch {
      toast("info", text);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Invite players">
      <p className="muted">Anyone with this link or code joins {team.name} straight away.</p>
      {code.isError ? (
        <ErrorView error={code.error} onRetry={() => void code.refetch()} />
      ) : (
        <>
          <div className="stack" style={{ alignItems: "center", gap: 6, padding: "20px 0", background: "var(--surface-sunken)", borderRadius: 20, border: "1px solid var(--border-strong)" }}>
            <span className="label">Team code</span>
            <span className="num" style={{ fontSize: 40, letterSpacing: "0.2em", color: "var(--brand)" }}>{code.data ?? "······"}</span>
          </div>
          <TextInput label="Invite link" value={link} readOnly onFocus={(e) => e.currentTarget.select()} />
          <div className="grid-2">
            <Button variant="secondary" icon={Copy} disabled={!code.data} onClick={() => copy(code.data!, "Code")}>Copy code</Button>
            <Button icon={Share2} disabled={!code.data} onClick={() => copy(`Join ${team.name} on PlayHere: ${link}`, "Invite message")}>Copy message</Button>
          </div>
        </>
      )}
    </Dialog>
  );
}

function AddPlayerDialog({ team, open, onClose }: { team: Team; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const results = useSearch(query);
  const queryClient = useQueryClient();
  const [run] = useAction();
  const add = async (p: Player) => {
    if (await run(() => teamApi.addPlayer(team.id, p.id), `${p.name} joined ${team.name}`)) {
      void queryClient.invalidateQueries({ queryKey: ["team", team.id] });
      onClose();
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Add a player">
      <TextInput placeholder="Search players by name" icon={Search} value={query} onValue={setQuery} autoFocus />
      <div className="stack" style={{ gap: 8, maxHeight: 360, overflowY: "auto" }}>
        {query.trim().length < 2 ? (
          <p className="faint small">Type at least 2 letters. Players need a PlayHere account to be added.</p>
        ) : results.data?.players.length ? (
          results.data.players.map((p) => <PlayerRow key={p.id} player={p} onClick={() => add(p)} trailing={<UserPlus size={18} color="var(--brand)" />} />)
        ) : (
          <p className="faint small">{results.isFetching ? "Searching…" : "No players found. Share your invite link instead."}</p>
        )}
      </div>
    </Dialog>
  );
}
