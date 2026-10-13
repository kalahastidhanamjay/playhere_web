import { useQueryClient } from "@tanstack/react-query";
import { AtSign, BadgeCheck, Check, Globe, MapPin, Phone, Send } from "lucide-react";
import { useParams } from "react-router";
import { useAction } from "@/components/overlay";
import { Button, Crest, Group, GroupRow, PageHeader, QueryView, Section, SkeletonList } from "@/components/ui";
import { socialApi, useOrganization } from "@/data/account";
import type { Organization } from "@/domain/models";
import { fmt } from "@/lib/format";

export default function OrganizationPage() {
  const { id = "" } = useParams();
  const query = useOrganization(id);
  return (
    <div className="page page-narrow">
      <PageHeader back title="Organisation" />
      <QueryView query={query} loading={<SkeletonList count={3} height={120} />}>
        {(o) => (
          <>
            <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 8 }}>
              <Crest name={o.name} logo={o.logoUrl} size={88} />
              <h1>
                {o.name} {o.verificationStatus === "APPROVED" && <BadgeCheck size={22} color="var(--info)" style={{ verticalAlign: -2 }} aria-label="Verified" />}
              </h1>
              <p className="muted">{fmt.label(o.organizationType)} · {[o.city, o.state].filter(Boolean).join(", ")}</p>
            </div>
            <div style={{ marginTop: 24 }}><Verification org={o} /></div>
            {o.description && <Section title="About"><div className="card muted">{o.description}</div></Section>}
            <Section title="Contact">
              <Group>
                {o.email && <GroupRow icon={AtSign} title={o.email} subtitle="Email" />}
                {o.phone && <GroupRow icon={Phone} title={o.phone} subtitle="Phone" />}
                {o.website && <GroupRow icon={Globe} title={o.website} subtitle="Website" />}
                <GroupRow icon={MapPin} title={[o.city, o.state, o.country].filter(Boolean).join(", ")} subtitle="Location" />
              </Group>
            </Section>
          </>
        )}
      </QueryView>
    </div>
  );
}

function Verification({ org: o }: { org: Organization }) {
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const steps = ["Created", "Under review", "Verified"];
  const current = o.verificationStatus === "APPROVED" ? 2 : o.verificationStatus === "UNDER_REVIEW" ? 1 : 0;
  const [title, body, tone] =
    {
      APPROVED: ["Verified organisation", "Your badge is live across PlayHere.", "var(--success)"],
      UNDER_REVIEW: ["In review", "Our team is checking your details. This usually takes up to 2 working days.", "var(--warning)"],
      MORE_INFORMATION_REQUIRED: ["More information needed", o.verificationNotes ?? "Please update your details and resubmit.", "var(--warning)"],
      REJECTED: ["Not approved", o.verificationNotes ?? "Update your details and submit again.", "var(--danger)"],
      SUSPENDED: ["Suspended", o.verificationNotes ?? "Contact support for details.", "var(--danger)"],
    }[o.verificationStatus] ?? ["Ready to submit", "Submit your organisation for verification to get the verified badge.", "var(--info)"];
  const canSubmit = ["PENDING", "MORE_INFORMATION_REQUIRED", "REJECTED"].includes(o.verificationStatus);

  return (
    <div className="card stack" style={{ gap: 16, borderColor: `color-mix(in srgb, ${tone} 40%, transparent)` }}>
      <div className="row" style={{ gap: 0 }}>
        {steps.map((s, i) => (
          <span key={s} className="row grow" style={{ gap: 0 }}>
            {i > 0 && <span className="grow" style={{ height: 2, background: i <= current ? tone : "var(--border)" }} />}
            <span style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: i <= current ? tone : "var(--surface-sunken)", color: "#fff", flex: "none" }}>
              {i <= current ? <Check size={15} /> : null}
            </span>
          </span>
        ))}
      </div>
      <div className="row spread faint tiny">{steps.map((s) => <span key={s}>{s}</span>)}</div>
      <div className="stack" style={{ gap: 4 }}>
        <h3 style={{ color: tone }}>{title}</h3>
        <p className="muted">{body}</p>
      </div>
      {canSubmit && (
        <Button
          icon={Send}
          loading={loading}
          onClick={async () => {
            if (await run(() => socialApi.submitOrganization(o.id), "Submitted for review")) {
              void queryClient.invalidateQueries({ queryKey: ["organization", o.id] });
              void queryClient.invalidateQueries({ queryKey: ["organizations"] });
            }
          }}
        >
          Submit for verification
        </Button>
      )}
    </div>
  );
}
