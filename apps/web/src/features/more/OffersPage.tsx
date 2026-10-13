import { useQueryClient } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { Link } from "react-router";
import { useAction, useFeedback } from "@/components/overlay";
import { Button, Crest, Empty, PageHeader, QueryView, SkeletonList, StatusPill } from "@/components/ui";
import { socialApi, useOffers } from "@/data/account";
import { useTeam } from "@/data/teams";
import type { Contract } from "@/domain/models";
import { fmt, parseDate } from "@/lib/format";

export default function OffersPage() {
  const query = useOffers();
  return (
    <div className="page page-mid">
      <PageHeader back title="Contract offers" subtitle="Offers from teams that want you" />
      <QueryView query={query} loading={<SkeletonList height={150} />}>
        {(items) =>
          items.length === 0 ? (
            <Empty icon={Handshake} title="No offers yet" message="Keep your player profile up to date. Team captains can send you contract offers." />
          ) : (
            <div className="stack" style={{ gap: 12 }}>{items.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
          )
        }
      </QueryView>
    </div>
  );
}

function OfferCard({ offer: o }: { offer: Contract }) {
  const team = useTeam(o.teamId).data;
  const queryClient = useQueryClient();
  const { confirm } = useFeedback();
  const [run, loading] = useAction();
  const respond = async (accept: boolean) => {
    if (!accept && !(await confirm({ title: "Decline this offer?", message: "The team will be told you declined. This can't be undone.", confirmLabel: "Decline", destructive: true }))) return;
    if (await run(() => (accept ? socialApi.acceptOffer(o.id) : socialApi.rejectOffer(o.id)), accept ? "Offer accepted. Welcome to the squad!" : "Offer declined")) {
      void queryClient.invalidateQueries({ queryKey: ["offers"] });
    }
  };
  return (
    <div className={`card stack ${o.status === "PENDING" ? "card-success" : ""}`} style={{ gap: 14, background: o.status === "PENDING" ? "var(--surface)" : undefined }}>
      <div className="row">
        <Crest name={team?.name ?? "Team"} logo={team?.logo} size={44} />
        <span className="grow stack" style={{ gap: 0 }}>
          <Link to={`/teams/${o.teamId}`}><strong>{team?.name ?? "Loading team…"}</strong></Link>
          <span className="faint small">Offered {fmt.relative(parseDate(o.createdAt))}</span>
        </span>
        <StatusPill status={o.status} />
      </div>
      <div className="row spread wrap">
        <span className="stack" style={{ gap: 0 }}>
          <span className="num" style={{ fontSize: 26, color: "var(--success)" }}>{fmt.money(o.offerAmount)}</span>
          <span className="faint tiny">Contract value</span>
        </span>
        <span className="stack" style={{ gap: 0, alignItems: "flex-end" }}>
          <strong>{fmt.dateRange(parseDate(o.startDate), parseDate(o.endDate))}</strong>
          <span className="faint tiny">Duration</span>
        </span>
      </div>
      {o.status === "PENDING" && (
        <div className="grid-2">
          <Button variant="secondary" disabled={loading} onClick={() => respond(false)}>Decline</Button>
          <Button loading={loading} onClick={() => respond(true)}>Accept</Button>
        </div>
      )}
    </div>
  );
}
