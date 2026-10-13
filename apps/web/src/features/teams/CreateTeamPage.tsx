import { useQueryClient } from "@tanstack/react-query";
import { Image, MapPin, Shield } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { SportGrid, SportIcon, useSportFilter } from "@/components/sport";
import { Button, Crest, PageHeader } from "@/components/ui";
import { teamApi } from "@/data/teams";
import { sportOf, type SportId } from "@/domain/sports";

export default function CreateTeamPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [preferred] = useSportFilter();
  const [sport, setSport] = useState<SportId>(sportOf(preferred).id);
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [logo, setLogo] = useState("");
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();
  const logoError = logo.trim() && !logo.trim().startsWith("http") ? "Enter a full https:// link" : null;
  const preview = name.trim() || "Your Team";

  return (
    <div className="page page-narrow">
      <PageHeader back title="Create a team" />
      <div className="stack" style={{ alignItems: "center", gap: 8, marginBottom: 24 }}>
        <span style={{ position: "relative" }}>
          <Crest name={preview} logo={logo.trim().startsWith("http") ? logo.trim() : null} size={88} />
          <span style={{ position: "absolute", right: -8, bottom: -8 }}><SportIcon sport={sport} size={34} /></span>
        </span>
        <h2>{preview}</h2>
        <p className="faint small">You'll be the captain. Invite players with a link, then enter tournaments.</p>
      </div>
      <form
        className="stack"
        style={{ gap: 20 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (!name.trim() || logoError) return;
          let id = "";
          const ok = await run(async () => {
            id = (await teamApi.create({ name: name.trim(), sportType: sport, village: village.trim() || undefined, logo: logo.trim() || undefined })).id;
          }, "Team created");
          if (ok) {
            void queryClient.invalidateQueries({ queryKey: ["teams"] });
            navigate(`/teams/${id}`, { replace: true });
          }
        }}
      >
        <SportGrid value={[sport]} onChange={([id]) => setSport(id)} label="Sport this team plays" />
        <TextInput label="Team name" icon={Shield} placeholder="e.g. Tirupati Titans" maxLength={60} value={name} onValue={setName} error={touched && !name.trim() ? "Team name is required" : null} autoFocus />
        <TextInput label="Home town / village" icon={MapPin} placeholder="Optional" value={village} onValue={setVillage} />
        <TextInput label="Logo URL" icon={Image} placeholder="Optional, https://…" value={logo} onValue={setLogo} error={touched ? logoError : null} />
        <Button type="submit" size="lg" block loading={loading}>Create team</Button>
      </form>
    </div>
  );
}
