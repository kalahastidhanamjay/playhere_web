import { useQueryClient } from "@tanstack/react-query";
import { Bell, Handshake, Trophy, Users, type LucideIcon } from "lucide-react";
import { Whistle } from "@/components/icons";
import { useAction } from "@/components/overlay";
import { Button, Empty, IconTile, PageHeader, QueryView, SkeletonList } from "@/components/ui";
import { socialApi, useNotifications } from "@/data/account";
import type { AppNotification } from "@/domain/models";
import { fmt, parseDate } from "@/lib/format";
import { useUserId } from "@/lib/session";

const STYLE: Record<string, [LucideIcon, [string, string]]> = {
  MATCH: [Whistle, ["#FF9A4D", "#FF3D5A"]],
  TEAM: [Users, ["#7C5CFF", "#4F46E5"]],
  CONTRACT: [Handshake, ["#34D399", "#059669"]],
  TOURNAMENT: [Trophy, ["#F5B83D", "#EA580C"]],
};

export default function NotificationsPage() {
  const query = useNotifications();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const unread = query.data?.filter((n) => !n.read) ?? [];

  const markRead = async (ids: string[]) => {
    queryClient.setQueryData<AppNotification[]>(["notifications", userId], (list) => list?.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    await run(() => Promise.all(ids.map(socialApi.markRead)));
  };

  return (
    <div className="page page-mid">
      <PageHeader
        back
        title="Notifications"
        subtitle={unread.length ? `${unread.length} unread` : "You're all caught up"}
        actions={unread.length > 0 && <Button size="sm" variant="ghost" loading={loading} onClick={() => markRead(unread.map((n) => n.id))}>Mark all read</Button>}
      />
      <QueryView query={query} loading={<SkeletonList height={76} />}>
        {(items) =>
          items.length === 0 ? (
            <Empty icon={Bell} title="No notifications yet" message="Join requests, registrations, contract offers and match updates land here." />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {items.map((n) => {
                const [Icon, colors] = STYLE[n.type?.toUpperCase()] ?? [Bell, ["#22C3EE", "#2563EB"]];
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`card card-link row row-top ${n.read ? "" : "card-brand"}`}
                    style={{ width: "100%", textAlign: "left", background: n.read ? undefined : "var(--surface-raised)" }}
                    onClick={() => !n.read && markRead([n.id])}
                  >
                    <IconTile icon={Icon} size={40} colors={colors} />
                    <span className="grow stack" style={{ gap: 4 }}>
                      <span style={{ fontWeight: n.read ? 500 : 700 }}>{n.message}</span>
                      <span className="faint tiny">{fmt.relative(parseDate(n.createdAt))}</span>
                    </span>
                    {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", marginTop: 6 }} aria-label="Unread" />}
                  </button>
                );
              })}
            </div>
          )
        }
      </QueryView>
    </div>
  );
}
