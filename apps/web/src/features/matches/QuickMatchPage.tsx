import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Search } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { TextInput } from "@/components/forms";
import { Dialog, useAction } from "@/components/overlay";
import { SportGrid, useSportFilter } from "@/components/sport";
import { Button, Crest, PageHeader } from "@/components/ui";
import { matchApi } from "@/data/matches";
import { useSearch } from "@/data/players";
import { useMyTeams } from "@/data/teams";
import type { Team } from "@/domain/models";
import { sportOf, type SportId } from "@/domain/sports";

interface Side {
  team?: Team;
  newName?: string;
}
const label = (s: Side) => s.team?.name ?? s.newName ?? "";
const isSet = (s: Side) => !!s.team || !!s.newName?.trim();
const OVERS = [5, 6, 8, 10, 12, 15, 20];

/** A friendly in about 30 seconds: sport, two teams, format, go. */
export default function QuickMatchPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [preferred] = useSportFilter();
  const [sportId, setSportId] = useState<SportId>(sportOf(preferred).id);
  const sport = sportOf(sportId);
  const [home, setHome] = useState<Side>({});
  const [away, setAway] = useState<Side>({});
  const [overs, setOvers] = useState(10);
  const [periods, setPeriods] = useState(sport.defaultPeriods);
  const [venue, setVenue] = useState("");
  const [picking, setPicking] = useState<"home" | "away" | null>(null);
  const [run, loading] = useAction();
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!isSet(home) || !isSet(away)) return setError("Pick both teams first");
    if (label(home).trim().toLowerCase() === label(away).trim().toLowerCase()) return setError("Pick two different teams");
    setError(null);
    let id = "";
    const ok = await run(async () => {
      const m = await matchApi.createFriendly({
        homeTeamId: home.team?.id,
        homeTeamName: home.team ? undefined : home.newName,
        awayTeamId: away.team?.id,
        awayTeamName: away.team ? undefined : away.newName,
        sportType: sport.id,
        oversPerSide: sport.scoring === "INNINGS" ? overs : undefined,
        periods: sport.scoring === "INNINGS" ? undefined : periods,
        venue: venue.trim() || undefined,
      });
      id = m.id;
    });
    if (ok) {
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      navigate(`/matches/${id}/score`, { replace: true });
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeader back title="Quick match" subtitle="Any sport, any ground. Score it live and share it as you play." />
      <div className="stack" style={{ gap: 24 }}>
        <SportGrid
          value={[sport.id]}
          onChange={([id]) => {
            const next = sportOf(id);
            setSportId(next.id);
            setPeriods(next.defaultPeriods);
            // Teams belong to one sport, so a new sport clears picked teams.
            setHome((s) => (s.team ? {} : s));
            setAway((s) => (s.team ? {} : s));
          }}
        />
        <div className="row row-top" style={{ alignItems: "center" }}>
          <SideCard label="Team A" side={home} onClick={() => setPicking("home")} />
          <span className="label" style={{ color: "var(--brand)", letterSpacing: "0.25em" }}>VS</span>
          <SideCard label="Team B" side={away} onClick={() => setPicking("away")} />
        </div>
        {error && <p className="small" style={{ color: "var(--danger)" }} role="alert">{error}</p>}

        {sport.scoring !== "INNINGS" && (
          <div className="field">
            <span>{sport.scoring === "SETS" ? `Best of (${sport.period.toLowerCase()}s)` : `${sport.period}s`}</span>
            <div className="chips">
              {sport.periodChoices.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={periods === n} onClick={() => setPeriods(n)}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {sport.scoring === "INNINGS" && <div className="field">
          <span>Overs per side</span>
          <div className="chips">
            {OVERS.map((o) => (
              <button key={o} type="button" className="chip" aria-pressed={overs === o} onClick={() => setOvers(o)}>{o}</button>
            ))}
            <label className="chip" aria-pressed={!OVERS.includes(overs)} style={{ paddingRight: 6 }}>
              Other
              <input
                type="number"
                min={1}
                max={50}
                aria-label="Custom overs"
                value={OVERS.includes(overs) ? "" : overs}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= 50) setOvers(n);
                }}
                style={{ width: 52, height: 28, border: 0, borderRadius: 8, background: "var(--surface-sunken)", color: "var(--text)", textAlign: "center", font: "inherit" }}
              />
            </label>
          </div>
        </div>}

        <TextInput label="Ground" placeholder={`Optional, e.g. ${sport.ground}`} icon={MapPin} value={venue} onValue={setVenue} />
        <Button size="lg" block loading={loading} onClick={create}>Create and start scoring</Button>
      </div>

      <TeamPicker
        open={picking !== null}
        sport={sport.id}
        exclude={(picking === "home" ? away : home).team?.id}
        onClose={() => setPicking(null)}
        onPick={(side) => {
          if (picking === "home") setHome(side);
          else setAway(side);
          setPicking(null);
        }}
      />
    </div>
  );
}

function SideCard({ label: title, side, onClick }: { label: string; side: Side; onClick: () => void }) {
  return (
    <div className="grow stack" style={{ gap: 8 }}>
      <span className="small muted" style={{ fontWeight: 600 }}>{title}</span>
      <button type="button" className={`card card-link stack ${isSet(side) ? "card-brand" : ""}`} style={{ alignItems: "center", padding: "20px 12px", width: "100%", gap: 10 }} onClick={onClick}>
        {isSet(side) ? (
          <Crest name={label(side)} logo={side.team?.logo} size={56} />
        ) : (
          <span style={{ width: 56, height: 56, borderRadius: 16, border: "1px dashed var(--border-strong)", display: "grid", placeItems: "center", color: "var(--text-3)" }}>
            <Plus size={22} />
          </span>
        )}
        <strong className="truncate" style={{ maxWidth: "100%", color: isSet(side) ? undefined : "var(--text-3)" }}>{isSet(side) ? label(side) : "Choose team"}</strong>
        {!side.team && isSet(side) && <span className="faint tiny">New team</span>}
      </button>
    </div>
  );
}

function TeamPicker({ open, sport, exclude, onClose, onPick }: { open: boolean; sport: SportId; exclude?: string; onClose: () => void; onPick: (s: Side) => void }) {
  const [query, setQuery] = useState("");
  const mine = useMyTeams().data ?? [];
  const search = useSearch(query);
  const typed = query.trim();
  const teams = (typed.length >= 2 ? search.data?.teams ?? [] : mine).filter((t) => t.id !== exclude && sportOf(t.sportType).id === sport);

  return (
    <Dialog open={open} onClose={onClose} title={`Choose a ${sportOf(sport).name.toLowerCase()} team`}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (typed) { onPick({ newName: typed }); setQuery(""); } }}>
        <TextInput placeholder="Search teams or type a new name" icon={Search} value={query} onValue={setQuery} autoFocus />
        {typed && (
          <button type="submit" className="card card-link row card-brand" style={{ width: "100%", textAlign: "left", background: "var(--brand-soft)" }}>
            <Plus size={18} color="var(--brand)" />
            <strong>Create "{typed}"</strong>
          </button>
        )}
        <span className="label">{typed.length >= 2 ? "Matching teams" : "Your teams"}</span>
        <div className="stack" style={{ gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {teams.length === 0 ? (
            <p className="faint small">{typed.length >= 2 ? "No teams found. Create it above." : "Type a name above to create a team."}</p>
          ) : (
            teams.map((t) => (
              <button key={t.id} type="button" className="card card-link row" style={{ width: "100%", textAlign: "left", padding: 12, "--gap": "12px" } as CSSProperties} onClick={() => { onPick({ team: t }); setQuery(""); }}>
                <Crest name={t.name} logo={t.logo} size={38} />
                <strong className="grow truncate">{t.name}</strong>
                <span className="faint small">{t.squadSize} players</span>
              </button>
            ))
          )}
        </div>
      </form>
    </Dialog>
  );
}
