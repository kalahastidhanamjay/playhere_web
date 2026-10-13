import { seededColors } from "@playhere/brand";
import { Check, MapPin, ShieldCheck } from "lucide-react";
import { useParams } from "react-router";
import { useFeedback } from "@/components/overlay";
import { Group, GroupRow, PageHeader, Pill, QueryView, Section, SkeletonList } from "@/components/ui";
import { useVenue } from "@/data/account";
import { fmt } from "@/lib/format";
import { amenities, venueIcon } from "./VenuesPage";

export default function VenuePage() {
  const { id = "" } = useParams();
  const query = useVenue(id);
  const { toast } = useFeedback();
  return (
    <div className="page page-narrow">
      <PageHeader back title="Ground" />
      <QueryView query={query} loading={<SkeletonList count={2} height={180} />}>
        {(v) => {
          const [a, b] = seededColors(v.venueType);
          const Icon = venueIcon(v.venueType);
          return (
            <>
              <div style={{ height: 180, borderRadius: 28, background: `linear-gradient(135deg, ${a}, ${b})`, position: "relative", overflow: "hidden", padding: 22, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, color: "#fff" }}>
                <Icon size={200} color="rgba(255,255,255,.18)" style={{ position: "absolute", right: -20, bottom: -30 }} aria-hidden />
                <span><Pill tone="glass">{fmt.label(v.venueType)}</Pill></span>
                <h1 style={{ color: "#fff" }}>{v.name}</h1>
              </div>
              <Section title="Details">
                <Group>
                  <GroupRow
                    icon={MapPin}
                    title={v.location}
                    subtitle="Tap to copy address"
                    onClick={() => void navigator.clipboard?.writeText(`${v.name}, ${v.location}`).then(() => toast("success", "Address copied"), () => toast("info", v.location))}
                  />
                  <GroupRow icon={ShieldCheck} title={v.status === "ACTIVE" ? "Open for bookings" : "Currently unavailable"} subtitle="Status" color={v.status === "ACTIVE" ? "var(--success)" : "var(--warning)"} />
                </Group>
              </Section>
              {amenities(v).length > 0 && (
                <Section title="Amenities">
                  <div className="row wrap" style={{ gap: 8 }}>{amenities(v).map((x) => <Pill key={x} tone="info" icon={Check}>{x}</Pill>)}</div>
                </Section>
              )}
            </>
          );
        }}
      </QueryView>
    </div>
  );
}
