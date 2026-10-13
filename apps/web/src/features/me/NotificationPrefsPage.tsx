import { useQueryClient } from "@tanstack/react-query";
import { Tag, Users } from "lucide-react";
import { useState } from "react";
import { Whistle } from "@/components/icons";
import { useAction } from "@/components/overlay";
import { Group, GroupRow, PageHeader, QueryView } from "@/components/ui";
import { accountApi, usePrefs } from "@/data/account";
import type { NotificationPrefs } from "@/domain/models";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 46, height: 28, borderRadius: 999, border: 0, cursor: "pointer", position: "relative", flex: "none",
        background: checked ? "var(--brand)" : "var(--surface-sunken)", boxShadow: "inset 0 0 0 1px var(--border-strong)", transition: "background .2s",
      }}
    >
      <span style={{ position: "absolute", top: 3, left: checked ? 21 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
    </button>
  );
}

export default function NotificationPrefsPage() {
  const query = usePrefs();
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<NotificationPrefs | null>(null);
  const [run] = useAction();

  return (
    <div className="page page-narrow">
      <PageHeader back title="Notifications" />
      <QueryView query={query}>
        {(server) => {
          const p = local ?? server;
          const update = async (next: NotificationPrefs) => {
            setLocal(next);
            if (!(await run(() => accountApi.updatePrefs(next)))) setLocal(p);
            else void queryClient.invalidateQueries({ queryKey: ["prefs"] });
          };
          const rows: [keyof NotificationPrefs, typeof Users, string, string][] = [
            ["matchNotifications", Whistle, "Matches", "Live scores, results and fixtures you follow"],
            ["teamNotifications", Users, "Teams", "Squad changes, join requests and contract offers"],
            ["promotionalNotifications", Tag, "News & offers", "Featured tournaments and PlayHere news"],
          ];
          return (
            <Group title="Send me updates about">
              {rows.map(([key, Icon, title, subtitle]) => (
                <GroupRow key={key} icon={Icon} title={title} subtitle={subtitle} trailing={<Switch label={title} checked={p[key]} onChange={(v) => update({ ...p, [key]: v })} />} />
              ))}
            </Group>
          );
        }}
      </QueryView>
    </div>
  );
}
