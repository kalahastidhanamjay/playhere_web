import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Megaphone, Send, Timer } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Whistle } from "@/components/icons";
import { Chips, TextArea } from "@/components/forms";
import { Dialog, useAction } from "@/components/overlay";
import { Button, Crest, Empty, PageHeader, Pill, QueryView, SkeletonList } from "@/components/ui";
import { socialApi, useApplications, useOpportunities } from "@/data/account";
import type { Opportunity } from "@/domain/models";
import { fmt, parseDate } from "@/lib/format";
import { useSession } from "@/lib/session";

export default function OpportunitiesPage() {
  const query = useOpportunities();
  const applied = new Set(useApplications().data?.map((a) => a.opportunityId));
  const [type, setType] = useState("ALL");
  const types = ["ALL", ...new Set(query.data?.map((o) => o.type.toUpperCase()) ?? [])];

  return (
    <div className="page page-mid">
      <PageHeader back title="Opportunities" subtitle="Trials, academies and recruitment" />
      <div className="stack" style={{ gap: 16 }}>
        {types.length > 2 && <Chips scroll value={type} onChange={setType} options={types.map((t) => ({ value: t, label: t === "ALL" ? "All" : fmt.label(t) }))} />}
        <QueryView query={query} loading={<SkeletonList height={170} />}>
          {(all) => {
            const items = type === "ALL" ? all : all.filter((o) => o.type.toUpperCase() === type);
            return items.length === 0 ? (
              <Empty icon={Megaphone} title="No open opportunities" message="Trials and recruitment drives from clubs and academies will appear here." />
            ) : (
              <div className="stack" style={{ gap: 12 }}>{items.map((o) => <OpportunityCard key={o.id} o={o} applied={applied.has(o.id)} />)}</div>
            );
          }}
        </QueryView>
      </div>
    </div>
  );
}

function OpportunityCard({ o, applied }: { o: Opportunity; applied: boolean }) {
  const { account } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [run, loading] = useAction();
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row">
        <Crest name={o.organizationName} size={42} />
        <span className="grow stack" style={{ gap: 0 }}>
          <strong>{o.title}</strong>
          <span className="faint small">{o.organizationName}</span>
        </span>
        <Pill tone="accent">{fmt.label(o.type)}</Pill>
      </div>
      {o.description && <p className="muted small">{o.description}</p>}
      <div className="row wrap" style={{ gap: 8 }}>
        <Pill icon={MapPin}>{o.location}</Pill>
        <Pill icon={Whistle}>{o.role === "ANY" ? "Any role" : fmt.label(o.role)}</Pill>
        <Pill tone="warning" icon={Timer}>{fmt.countdown(parseDate(o.deadline))}</Pill>
      </div>
      {applied ? (
        <span className="row" style={{ color: "var(--success)", fontWeight: 700 }}><CheckCircle2 size={18} /> Applied</span>
      ) : (
        <Button onClick={() => (account ? setOpen(true) : navigate("/login?from=/opportunities"))}>Apply now</Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={`Apply to ${o.title}`}>
        <TextArea label="Message (optional)" placeholder="Your game, experience and availability" maxLength={500} value={message} onValue={setMessage} />
        <Button
          block
          icon={Send}
          loading={loading}
          onClick={async () => {
            if (await run(() => socialApi.apply(o.id, message.trim() || undefined), "Application sent. Good luck!")) {
              setOpen(false);
              void queryClient.invalidateQueries({ queryKey: ["applications"] });
            }
          }}
        >
          Submit application
        </Button>
      </Dialog>
    </div>
  );
}
