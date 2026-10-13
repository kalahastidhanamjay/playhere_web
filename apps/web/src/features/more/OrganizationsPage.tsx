import { ArrowRight, BadgeCheck, Building2, ChartLine, Megaphone, Plus } from "lucide-react";
import { Link } from "react-router";
import { ButtonLink, Crest, PageHeader, QueryView, SkeletonList, StatusPill } from "@/components/ui";
import { useMyOrganizations } from "@/data/account";
import { fmt } from "@/lib/format";

export default function OrganizationsPage() {
  const query = useMyOrganizations();
  return (
    <div className="page page-mid">
      <PageHeader
        back
        title="Organisations"
        subtitle="Clubs, academies and organisers you run"
        actions={query.data?.length ? <ButtonLink to="/organizations/new" size="sm" icon={Plus}>New</ButtonLink> : undefined}
      />
      <QueryView query={query} loading={<SkeletonList height={80} />}>
        {(items) =>
          items.length === 0 ? (
            <BecomeOrganizer />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {items.map((o) => (
                <Link key={o.id} to={`/organizations/${o.id}`} className="card card-link row">
                  <Crest name={o.name} logo={o.logoUrl} size={48} />
                  <span className="grow stack" style={{ gap: 2 }}>
                    <strong className="truncate">
                      {o.name} {o.verificationStatus === "APPROVED" && <BadgeCheck size={16} color="var(--info)" style={{ verticalAlign: -3 }} aria-label="Verified" />}
                    </strong>
                    <span className="faint small truncate">{fmt.label(o.organizationType)} · {[o.city, o.state].filter(Boolean).join(", ")}</span>
                  </span>
                  <StatusPill status={o.verificationStatus} />
                </Link>
              ))}
            </div>
          )
        }
      </QueryView>
    </div>
  );
}

function BecomeOrganizer() {
  const perks = [
    [BadgeCheck, "Verified badge", "Players and teams know your events are legitimate."],
    [Megaphone, "Post opportunities", "Run trials and recruit through PlayHere."],
    [ChartLine, "Professional tools", "Fixtures, live scoring and standings out of the box."],
  ] as const;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="card card-hero stack" style={{ padding: 28, gap: 10 }}>
        <Building2 size={36} />
        <h2 style={{ color: "#fff" }}>Become a verified organiser</h2>
        <p className="muted">Register your club, academy or tournament body. Our team reviews it within 2 working days.</p>
      </div>
      {perks.map(([Icon, title, body]) => (
        <div key={title} className="row row-top">
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand)", display: "grid", placeItems: "center", flex: "none" }}><Icon size={20} /></span>
          <span className="stack" style={{ gap: 0 }}>
            <strong>{title}</strong>
            <span className="faint small">{body}</span>
          </span>
        </div>
      ))}
      <ButtonLink to="/organizations/new" size="lg" block>Register an organisation <ArrowRight size={18} /></ButtonLink>
    </div>
  );
}
