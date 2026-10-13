import { useQueryClient } from "@tanstack/react-query";
import { AtSign, Building2, Globe, Phone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Select, TextArea, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { SportGrid } from "@/components/sport";
import { Button, PageHeader } from "@/components/ui";
import { socialApi } from "@/data/account";
import { ORGANIZATION_TYPES } from "@/domain/models";
import type { SportId } from "@/domain/sports";
import { fmt } from "@/lib/format";
import { useSession } from "@/lib/session";

export default function CreateOrganizationPage() {
  const { account } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const [form, setForm] = useState({
    name: "", organizationType: ORGANIZATION_TYPES[0] as string, description: "", city: "", state: "", country: "India",
    email: account?.email ?? "", phone: "", website: "",
  });
  const [sport, setSport] = useState<SportId>("CRICKET");
  const [touched, setTouched] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const errors = {
    name: !form.name.trim() ? "Name is required" : null,
    description: form.description.trim().length < 20 ? "Add a short description (20+ characters)" : null,
    city: !form.city.trim() ? "City is required" : null,
    state: !form.state.trim() ? "State is required" : null,
  };
  const show = (e: string | null) => (touched ? e : null);

  return (
    <div className="page page-narrow">
      <PageHeader back title="Register organisation" subtitle="Tell us about your club or organising body. You can submit it for verification next." />
      <form
        className="stack"
        style={{ gap: 20 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (Object.values(errors).some(Boolean)) return;
          let id = "";
          const opt = (v: string) => v.trim() || null;
          const ok = await run(async () => {
            id = (await socialApi.createOrganization({
              name: form.name.trim(), organizationType: form.organizationType, description: form.description.trim(), primarySport: sport,
              city: form.city.trim(), state: form.state.trim(), country: form.country.trim(),
              email: opt(form.email), phone: opt(form.phone), website: opt(form.website),
            })).id;
          }, "Organisation created");
          if (ok) {
            void queryClient.invalidateQueries({ queryKey: ["organizations"] });
            navigate(`/organizations/${id}`, { replace: true });
          }
        }}
      >
        <TextInput label="Organisation name" icon={Building2} value={form.name} onValue={set("name")} error={show(errors.name)} />
        <SportGrid label="Main sport" value={[sport]} onChange={([id]) => setSport(id)} />
        <Select label="Type" value={form.organizationType} onValue={set("organizationType")} options={ORGANIZATION_TYPES.map((t) => ({ value: t, label: fmt.label(t) }))} />
        <div className="stack" style={{ gap: 6 }}>
          <TextArea label="About" placeholder="What you run, since when, and who for" maxLength={600} value={form.description} onValue={set("description")} />
          {show(errors.description) && <span className="small" style={{ color: "var(--danger)" }}>{errors.description}</span>}
        </div>
        <span className="label" style={{ color: "var(--brand)" }}>Location</span>
        <div className="grid-2">
          <TextInput label="City" value={form.city} onValue={set("city")} error={show(errors.city)} />
          <TextInput label="State" value={form.state} onValue={set("state")} error={show(errors.state)} />
        </div>
        <TextInput label="Country" value={form.country} onValue={set("country")} />
        <span className="label" style={{ color: "var(--brand)" }}>Contact</span>
        <TextInput label="Email" type="email" icon={AtSign} value={form.email} onValue={set("email")} />
        <TextInput label="Phone" type="tel" icon={Phone} value={form.phone} onValue={set("phone")} />
        <TextInput label="Website" icon={Globe} placeholder="Optional" value={form.website} onValue={set("website")} />
        <Button type="submit" size="lg" block loading={loading}>Create organisation</Button>
      </form>
    </div>
  );
}
