import { LogoMark } from "@playhere/brand";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button } from "@/components/ui";
import { playerApi, useMyPlayer } from "@/data/players";
import { displayName, firstName } from "@/domain/cricket";
import { sportOf } from "@/domain/sports";
import { useSession } from "@/lib/session";
import { storage } from "@/lib/storage";
import { SportProfileFields, sportProfileFrom, sportProfileInput } from "./SportProfileFields";

/** One screen after sign-up: how you play and where. Everyone is a player. */
export default function OnboardingPage() {
  const { account } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/";
  const queryClient = useQueryClient();
  const existing = useMyPlayer().data;
  const [profile, setProfile] = useState(() => sportProfileFrom(null));
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(storage.city());
  const [run, loading] = useAction();

  useEffect(() => {
    if (!existing) return;
    setProfile(sportProfileFrom(existing));
    if (existing.village && existing.village !== "Unknown") setCity((c) => c || existing.village!);
  }, [existing]);

  async function save() {
    if (!profile.sports.length) return setError("Pick at least one sport");
    setError(null);
    const input = {
      name: existing?.name ?? (account ? displayName(account) : "Player"),
      village: city.trim() || existing?.village || null,
      district: existing?.district ?? null,
      state: existing?.state ?? null,
      dateOfBirth: existing?.dateOfBirth ?? null,
      bio: existing?.bio ?? null,
      ...sportProfileInput(profile),
    };
    const ok = await run(() => (existing ? playerApi.update(input) : playerApi.create(input)), "You're in! Every match you play now counts.");
    if (ok) {
      if (city.trim()) storage.setCity(city.trim());
      // Discovery opens on your main sport.
      storage.setSport(sportOf(profile.sports[0]).id);
      void queryClient.invalidateQueries({ queryKey: ["player"] });
      navigate(next, { replace: true });
    }
  }

  return (
    <div className="auth">
      <div className="auth-card" style={{ width: "min(560px, 100%)" }}>
        <div className="row spread">
          <LogoMark size={48} />
          <Link to={next} className="link">Skip</Link>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <h1>{account ? `How do you play, ${firstName(account)}?` : "How do you play?"}</h1>
          <p className="muted" style={{ fontSize: 16 }}>Pick your sports so your feed, teams and stats fit the way you play.</p>
        </div>
        <SportProfileFields value={profile} onChange={setProfile} />
        {error && <p className="small" style={{ color: "var(--danger)" }} role="alert">{error}</p>}
        <TextInput label="Where do you play?" placeholder="Town or city, e.g. Tirupati" icon={MapPin} value={city} onValue={setCity} />
        <Button size="lg" block loading={loading} trailing={ArrowRight} onClick={save}>Let's play</Button>
      </div>
    </div>
  );
}
