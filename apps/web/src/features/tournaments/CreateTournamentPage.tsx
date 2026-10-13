import { useQueryClient } from "@tanstack/react-query";
import { Check, GitFork, MapPin, Rows3, Trophy } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { SportGrid, useSportFilter } from "@/components/sport";
import { Button, PageHeader } from "@/components/ui";
import { tournamentApi } from "@/data/tournaments";
import { sportOf, type SportId } from "@/domain/sports";
import { storage } from "@/lib/storage";

const today = () => new Date().toISOString().slice(0, 10);

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [preferred] = useSportFilter();
  const [sport, setSport] = useState<SportId>(sportOf(preferred).id);
  const [name, setName] = useState("");
  const [location, setLocation] = useState(storage.city());
  const [type, setType] = useState<"LEAGUE" | "KNOCKOUT">("LEAGUE");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [entry, setEntry] = useState("");
  const [prize, setPrize] = useState("");
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();

  const money = (v: string) => (v.trim() ? Number(v.replace(/,/g, "")) : undefined);
  const errors = {
    name: !name.trim() ? "Name is required" : null,
    location: !location.trim() ? "Location is required" : null,
    dates: !start || !end ? "Pick the start and end dates" : end < start ? "End date must be on or after the start date" : null,
    entry: entry && Number.isNaN(money(entry)) ? "Enter a valid amount" : null,
    prize: prize && Number.isNaN(money(prize)) ? "Enter a valid amount" : null,
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    let id = "";
    const ok = await run(async () => {
      const t = await tournamentApi.create({
        name: name.trim(),
        location: location.trim(),
        sportType: sport,
        tournamentType: type,
        startDate: start,
        endDate: end,
        entryFee: money(entry),
        prizePool: money(prize),
      });
      id = t.id;
    }, "Tournament created");
    if (ok) {
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      navigate(`/tournaments/${id}`, { replace: true });
    }
  }

  const show = (msg: string | null) => (touched ? msg : null);

  return (
    <div className="page page-narrow">
      <PageHeader back title="Host a tournament" subtitle="Set the basics now. Teams can register as soon as it's published." />
      <form className="stack" style={{ gap: 20 }} onSubmit={submit}>
        <SportGrid value={[sport]} onChange={([id]) => setSport(id)} />
        <TextInput label="Tournament name" icon={Trophy} placeholder={`e.g. Tirupati ${sportOf(sport).name} Cup 2026`} value={name} onValue={setName} error={show(errors.name)} />
        <TextInput label="City / ground" icon={MapPin} placeholder="e.g. Tirupati" value={location} onValue={setLocation} error={show(errors.location)} />
        <div className="field">
          <span>Format</span>
          <div className="grid-2">
            {([
              ["LEAGUE", Rows3, "League", "Round-robin + points table"],
              ["KNOCKOUT", GitFork, "Knockout", "Win or go home"],
            ] as const).map(([value, Icon, title, body]) => (
              <button
                key={value}
                type="button"
                className={`card card-link stack ${type === value ? "card-brand" : ""}`}
                style={{ textAlign: "left", gap: 10, background: type === value ? "var(--brand-soft)" : undefined }}
                aria-pressed={type === value}
                onClick={() => setType(value)}
              >
                <span className="row spread">
                  <Icon size={20} color={type === value ? "var(--brand)" : "var(--text-2)"} />
                  {type === value && <Check size={18} color="var(--brand)" />}
                </span>
                <span className="stack" style={{ gap: 0 }}>
                  <strong>{title}</strong>
                  <span className="faint small">{body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <TextInput label="Starts" type="date" min={today()} value={start} onValue={setStart} />
          <TextInput label="Ends" type="date" min={start || today()} value={end} onValue={setEnd} />
        </div>
        {show(errors.dates) && <p className="small" style={{ color: "var(--danger)", marginTop: -10 }} role="alert">{errors.dates}</p>}
        <div className="grid-2">
          <TextInput label="Entry fee (₹)" inputMode="decimal" placeholder="0 = free" value={entry} onValue={setEntry} error={show(errors.entry)} />
          <TextInput label="Prize pool (₹)" inputMode="decimal" placeholder="Optional" value={prize} onValue={setPrize} error={show(errors.prize)} />
        </div>
        <Button type="submit" size="lg" block loading={loading}>Create tournament</Button>
      </form>
    </div>
  );
}
