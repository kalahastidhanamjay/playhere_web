import { useQueryClient } from "@tanstack/react-query";
import { AtSign, Globe, ListChecks, Phone } from "lucide-react";
import { useState } from "react";
import { TextArea } from "@/components/forms";
import { Dialog, useAction } from "@/components/overlay";
import { Button, Crest, Empty, PageHeader, Pill, QueryView, SkeletonList, StatusPill } from "@/components/ui";
import { socialApi, usePendingOrganizations } from "@/data/account";
import type { Organization } from "@/domain/models";
import { fmt, parseDate } from "@/lib/format";

/** Platform admin: review organisation verification requests. */
export default function AdminPage() {
  const query = usePendingOrganizations();
  return (
    <div className="page page-mid">
      <PageHeader back title="Admin console" subtitle="Organisation verification queue" />
      <QueryView query={query} loading={<SkeletonList height={160} />}>
        {(items) =>
          items.length === 0 ? (
            <Empty icon={ListChecks} title="Queue is clear" message="No organisations are waiting for review." />
          ) : (
            <div className="stack" style={{ gap: 12 }}>{items.map((o) => <ReviewCard key={o.id} org={o} />)}</div>
          )
        }
      </QueryView>
    </div>
  );
}

function ReviewCard({ org: o }: { org: Organization }) {
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const [action, setAction] = useState<null | { id: string; label: string }>(null);
  const [notes, setNotes] = useState("");

  const review = async (id: string, label: string, note?: string) => {
    if (await run(() => socialApi.reviewOrganization(o.id, id, note), `${o.name}: ${label}`)) {
      setAction(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    }
  };

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row">
        <Crest name={o.name} size={44} />
        <span className="grow stack" style={{ gap: 0 }}>
          <strong>{o.name}</strong>
          <span className="faint small">{fmt.label(o.organizationType)} · {o.city} · {fmt.relative(parseDate(o.createdAt))}</span>
        </span>
        <StatusPill status={o.verificationStatus} />
      </div>
      {o.description && <p className="muted small">{o.description}</p>}
      <div className="row wrap" style={{ gap: 8 }}>
        {o.email && <Pill icon={AtSign}>{o.email}</Pill>}
        {o.phone && <Pill icon={Phone}>{o.phone}</Pill>}
        {o.website && <Pill icon={Globe}>{o.website}</Pill>}
      </div>
      <div className="row">
        <Button size="sm" variant="secondary" className="grow" onClick={() => setAction({ id: "request-information", label: "Request info" })}>Ask info</Button>
        <Button size="sm" variant="danger" className="grow" onClick={() => setAction({ id: "reject", label: "Reject" })}>Reject</Button>
        <Button size="sm" className="grow" loading={loading && !action} onClick={() => review("approve", "Approved")}>Approve</Button>
      </div>
      <Dialog open={!!action} onClose={() => setAction(null)} title={action?.label}>
        <TextArea label="Note for the organiser" value={notes} onValue={setNotes} />
        <Button block loading={loading} variant={action?.id === "reject" ? "danger" : "primary"} onClick={() => action && review(action.id, action.label, notes.trim() || undefined)}>
          {action?.label}
        </Button>
      </Dialog>
    </div>
  );
}
