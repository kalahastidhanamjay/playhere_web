import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Cake, House as HomeIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { TextArea, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button, PageHeader, SkeletonList } from "@/components/ui";
import { playerApi, useMyPlayer, type PlayerInput } from "@/data/players";
import { displayName } from "@/domain/cricket";
import type { Player } from "@/domain/models";
import { useSession } from "@/lib/session";
import { SportProfileFields, sportProfileFrom, sportProfileInput } from "./SportProfileFields";

/** Create or edit the signed-in user's player profile. */
export default function PlayerEditPage() {
  const query = useMyPlayer();
  if (query.isPending) return <div className="page page-narrow"><SkeletonList count={4} height={70} /></div>;
  return <PlayerForm existing={query.data ?? null} />;
}

const clean = (v: string | null | undefined) => (v && v !== "Unknown" ? v : "");

function PlayerForm({ existing }: { existing: Player | null }) {
  const { account } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const [name, setName] = useState(existing?.name ?? (account ? displayName(account) : ""));
  const [profile, setProfile] = useState(() => sportProfileFrom(existing ?? { sports: ["CRICKET"] }));
  const [dob, setDob] = useState(existing?.dateOfBirth ?? "");
  const [village, setVillage] = useState(clean(existing?.village));
  const [district, setDistrict] = useState(clean(existing?.district));
  const [state, setState] = useState(clean(existing?.state));
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const opt = (v: string) => (v.trim() ? v.trim() : null);

  return (
    <div className="page page-narrow">
      <PageHeader back title={existing ? "Edit player profile" : "Create player profile"} subtitle={existing ? undefined : "It unlocks squads, stats and scouting. You can change it any time."} />
      <form
        className="stack"
        style={{ gap: 20 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (!name.trim() || !profile.sports.length) return;
          const input: PlayerInput = {
            name: name.trim(), ...sportProfileInput(profile),
            dateOfBirth: opt(dob), village: opt(village), district: opt(district), state: opt(state), bio: opt(bio),
          };
          const ok = await run(() => (existing ? playerApi.update(input) : playerApi.create(input)), existing ? "Player profile updated" : "Your player profile is live");
          if (ok) {
            void queryClient.invalidateQueries({ queryKey: ["player"] });
            navigate(-1);
          }
        }}
      >
        <TextInput label="Name on scorecards" icon={BadgeCheck} value={name} onValue={setName} error={touched && !name.trim() ? "Name is required" : null} />
        <SportProfileFields value={profile} onChange={setProfile} compactBowling />
        {touched && !profile.sports.length && <p className="small" style={{ color: "var(--danger)" }} role="alert">Pick at least one sport</p>}
        <TextInput label="Date of birth" type="date" icon={Cake} value={dob} onValue={setDob} max={new Date().toISOString().slice(0, 10)} />
        <span className="label" style={{ color: "var(--brand)" }}>Where you play</span>
        <TextInput label="Village / town" icon={HomeIcon} value={village} onValue={setVillage} />
        <div className="grid-2">
          <TextInput label="District" value={district} onValue={setDistrict} />
          <TextInput label="State" value={state} onValue={setState} />
        </div>
        <TextArea label="About you" placeholder="Your game in a few lines: strengths, teams, highlights" maxLength={280} value={bio} onValue={setBio} />
        <Button type="submit" size="lg" block loading={loading}>{existing ? "Save changes" : "Create profile"}</Button>
      </form>
    </div>
  );
}
