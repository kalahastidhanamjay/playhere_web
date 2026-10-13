import { useQueryClient } from "@tanstack/react-query";
import { Activity as Insights, Cake, Copy, Hand, Handshake, MapPin, Medal, PenLine as Edit3, Star } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useParams } from "react-router";
import { Cricket } from "@/components/icons";
import { SportTag } from "@/components/sport";
import { Segmented, Select, TextInput } from "@/components/forms";
import { Dialog, useAction, useFeedback } from "@/components/overlay";
import { Avatar, Breadcrumbs, Button, ButtonLink, Group, GroupRow, IconTile, Pill, QueryView, Section, Skeleton, SkeletonList, StatTile } from "@/components/ui";
import { socialApi } from "@/data/account";
import { playerApi, useAchievements, usePlayer, usePlayerStats, useWatchlist } from "@/data/players";
import { useOwnedTeams } from "@/data/teams";
import { bowlingLabel, playerAge, playerPlace, roleLabel, sportsOf } from "@/domain/cricket";
import { isCricket, sportOf } from "@/domain/sports";
import type { CareerStats, Player, Team } from "@/domain/models";
import { fmt, parseDate } from "@/lib/format";
import { useSession } from "@/lib/session";

export default function PlayerPage() {
  const { id = "" } = useParams();
  const query = usePlayer(id);
  return (
    <div className="page page-mid">
      <QueryView query={query} loading={<SkeletonList count={3} height={160} />}>
        {(p) => (
          <>
            <Breadcrumbs current={p.name} trail={[{ label: "Home", to: "/" }, { label: "Rankings", to: "/leaderboard" }]} />
            <PlayerProfile player={p} />
          </>
        )}
      </QueryView>
    </div>
  );
}

function PlayerProfile({ player: p }: { player: Player }) {
  const { account } = useSession();
  const stats = usePlayerStats(p.id);
  const achievements = useAchievements(p.id).data ?? [];
  const { toast } = useFeedback();
  const isMe = account?.id === p.id;
  const place = playerPlace(p);
  const age = playerAge(p);
  const plays = sportsOf(p).some(isCricket);
  const otherId = sportsOf(p).find((s) => !isCricket(s));
  const other = otherId ? sportOf(otherId) : null;

  return (
    <>
      <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 10, paddingTop: 12 }}>
        <Avatar name={p.name} src={p.profilePhoto} size={104} ring />
        <h1>{p.name}</h1>
        <div className="row wrap" style={{ justifyContent: "center" }}>
          {sportsOf(p).map((s) => <SportTag key={s} sport={s} />)}
          {place && <Pill icon={MapPin}>{place}</Pill>}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {isMe ? <ButtonLink to="/me/player" variant="secondary" block icon={Edit3}>Edit player profile</ButtonLink> : account ? <Actions player={p} /> : null}
      </div>

      {plays && (
        <Section title="Cricket career stats">
          {stats.data ? <StatsPanel stats={stats.data} /> : <Skeleton height={200} />}
        </Section>
      )}

      {p.bio?.trim() && (
        <Section title="About">
          <div className="card muted">{p.bio}</div>
        </Section>
      )}

      <Section title="Profile">
        <Group>
          {other && p.position && <GroupRow icon={other.icon} title={p.position} subtitle={`${other.name} position`} />}
          {plays && <GroupRow icon={Cricket} title={roleLabel(p.playerRole)} subtitle="Cricket role" />}
          {plays && <GroupRow icon={Hand} title={fmt.label(p.battingStyle)} subtitle="Batting" />}
          {plays && <GroupRow icon={Insights} title={bowlingLabel(p.bowlingStyle)} subtitle="Bowling" />}
          {age !== null && <GroupRow icon={Cake} title={`${age} years`} subtitle="Age" />}
          {p.playerCode && (
            <GroupRow
              icon={Copy}
              title={p.playerCode}
              subtitle="Player ID · tap to copy"
              onClick={() => {
                void navigator.clipboard?.writeText(p.playerCode!).then(() => toast("success", "Player ID copied"), () => toast("info", p.playerCode!));
              }}
            />
          )}
        </Group>
      </Section>

      {achievements.length > 0 && (
        <Section title="Achievements">
          <div className="stack" style={{ gap: 8 }}>
            {achievements.map((a) => (
              <div key={a.id} className="card row row-top">
                <IconTile icon={Medal} size={40} colors={["#F5C451", "#EA580C"]} />
                <span className="grow stack" style={{ gap: 2 }}>
                  <strong>{a.title}</strong>
                  <span className="muted small">{a.description}</span>
                  {a.achievementDate && <span className="faint tiny">{fmt.date(parseDate(a.achievementDate))}</span>}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function Actions({ player }: { player: Player }) {
  const watchlist = useWatchlist().data ?? [];
  const owned = useOwnedTeams().data ?? [];
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const [offerOpen, setOfferOpen] = useState(false);
  const watching = watchlist.some((p) => p.id === player.id);
  return (
    <div className="grid-2" style={{ gridTemplateColumns: owned.length ? undefined : "1fr" }}>
      <Button
        variant={watching ? "secondary" : "primary"}
        icon={Star}
        loading={loading}
        onClick={async () => {
          if (await run(() => (watching ? playerApi.unwatch(player.id) : playerApi.watch(player.id)), watching ? "Removed from watchlist" : "Added to watchlist")) {
            void queryClient.invalidateQueries({ queryKey: ["watchlist"] });
          }
        }}
      >
        {watching ? "Watching" : "Add to watchlist"}
      </Button>
      {owned.length > 0 && <Button variant="secondary" icon={Handshake} onClick={() => setOfferOpen(true)}>Offer contract</Button>}
      {owned.length > 0 && <OfferDialog player={player} teams={owned} open={offerOpen} onClose={() => setOfferOpen(false)} />}
    </div>
  );
}

function StatsPanel({ stats: s }: { stats: CareerStats }) {
  const [tab, setTab] = useState<"bat" | "bowl">("bat");
  const empty = s.matches === 0 && s.runs === 0 && s.wickets === 0;
  const tiles =
    tab === "bat"
      ? [[s.runs, "Runs", true], [s.average.toFixed(1), "Average"], [s.strikeRate.toFixed(1), "Strike rate"], [s.innings, "Innings"], [s.fifties, "50s"], [s.hundreds, "100s"]]
      : [[s.wickets, "Wickets", true], [s.economy.toFixed(2), "Economy"], [s.bowlingAverage.toFixed(1), "Average"], [fmt.overs(s.oversBowled), "Overs"], [s.runsConceded, "Runs conceded"], [s.matches, "Matches"]];
  return (
    <div className="stack">
      <Segmented value={tab} onChange={setTab} options={[{ value: "bat", label: "Batting" }, { value: "bowl", label: "Bowling" }]} />
      {empty && <p className="faint small">No match data yet. Stats update automatically from scored matches.</p>}
      <div className="grid" style={{ "--min": "130px" } as CSSProperties}>
        {tiles.map(([v, label, hot]) => <StatTile key={String(label)} value={v as string | number} label={String(label)} hot={!!hot} />)}
      </div>
    </div>
  );
}

function OfferDialog({ player, teams, open, onClose }: { player: Player; teams: Team[]; open: boolean; onClose: () => void }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(nextYear);
  const [run, loading] = useAction();
  const value = Number(amount.replace(/,/g, ""));
  return (
    <Dialog open={open} onClose={onClose} title={`Offer a contract to ${player.name}`}>
      <Select label="Team" value={teamId} onValue={setTeamId} options={teams.map((t) => ({ value: t.id, label: t.name }))} />
      <TextInput label="Offer amount (₹)" inputMode="numeric" value={amount} onValue={setAmount} />
      <div className="grid-2">
        <TextInput label="Starts" type="date" value={start} onValue={setStart} />
        <TextInput label="Ends" type="date" min={start} value={end} onValue={setEnd} />
      </div>
      <Button
        block
        loading={loading}
        disabled={!value || value <= 0 || !start || !end || end < start}
        onClick={async () => {
          if (await run(() => socialApi.offer({ playerId: player.id, teamId, offerAmount: value, startDate: start, endDate: end }), `Offer sent to ${player.name}`)) onClose();
        }}
      >
        Send offer
      </Button>
    </Dialog>
  );
}
