import { seededColors } from "@playhere/brand";
import { ChevronRight, Landmark, Sprout, Warehouse, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Cricket } from "@/components/icons";
import { Empty, IconTile, PageHeader, Pill, QueryView, SkeletonList } from "@/components/ui";
import { useVenues } from "@/data/account";
import type { Venue } from "@/domain/models";
import { fmt } from "@/lib/format";
import { storage } from "@/lib/storage";

export const venueIcon = (type: string): LucideIcon =>
  ({ TURF: Sprout, NETS: Cricket, STADIUM: Landmark } as Record<string, LucideIcon>)[type.toUpperCase()] ?? Warehouse;

export const amenities = (v: Venue) => (v.amenities ?? "").split(/[,;|]/).map((s) => s.trim()).filter(Boolean);

export default function VenuesPage() {
  const query = useVenues();
  const city = storage.city();
  return (
    <div className="page page-mid">
      <PageHeader back title="Grounds & nets" subtitle={city ? `Near ${city}` : "All cities"} />
      <QueryView query={query} loading={<SkeletonList height={100} />}>
        {(items) =>
          items.length === 0 ? (
            <Empty icon={Warehouse} title="No grounds listed yet" message="Check back soon. New venues are added regularly." />
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {items.map((v) => (
                <Link key={v.id} to={`/venues/${v.id}`} className="card card-link row">
                  <IconTile icon={venueIcon(v.venueType)} size={54} colors={seededColors(v.venueType)} />
                  <span className="grow stack" style={{ gap: 4 }}>
                    <strong className="truncate">{v.name}</strong>
                    <span className="faint small truncate">{fmt.label(v.venueType)} · {v.location}</span>
                    {amenities(v).length > 0 && (
                      <span className="row wrap" style={{ gap: 4 }}>{amenities(v).slice(0, 3).map((a) => <Pill key={a}>{a}</Pill>)}</span>
                    )}
                  </span>
                  <ChevronRight size={18} className="faint" />
                </Link>
              ))}
            </div>
          )
        }
      </QueryView>
    </div>
  );
}
