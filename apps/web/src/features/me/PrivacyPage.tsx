import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Circle, Globe, Languages, Lock, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/overlay";
import { Button, Group, GroupRow, PageHeader, QueryView } from "@/components/ui";
import { accountApi, useSettings } from "@/data/account";
import type { AccountSettings } from "@/domain/models";
import { storage } from "@/lib/storage";

export default function PrivacyPage() {
  const query = useSettings();
  const queryClient = useQueryClient();
  const [run] = useAction();
  const [city, setCity] = useState(storage.city());

  const save = async (next: AccountSettings) => {
    if (await run(() => accountApi.updateSettings(next), "Saved")) void queryClient.invalidateQueries({ queryKey: ["settings"] });
  };
  const radio = (on: boolean) => (on ? <CircleCheck size={20} color="var(--brand)" /> : <Circle size={20} className="faint" />);

  return (
    <div className="page page-narrow">
      <PageHeader back title="Privacy & language" />
      <QueryView query={query}>
        {(s) => (
          <div className="stack" style={{ gap: 24 }}>
            <Group title="Profile visibility">
              {([
                ["PUBLIC", Globe, "Public", "Anyone can view your profile and stats"],
                ["FOLLOWERS", Users, "Followers", "Only people who follow you"],
                ["PRIVATE", Lock, "Private", "Only you and your teams"],
              ] as const).map(([value, Icon, title, subtitle]) => (
                <GroupRow key={value} icon={Icon} title={title} subtitle={subtitle} trailing={radio(s.profileVisibility === value)} onClick={s.profileVisibility === value ? undefined : () => save({ ...s, profileVisibility: value })} />
              ))}
            </Group>
            <Group title="Language">
              {([
                ["en", "English"],
                ["hi", "हिन्दी · Hindi"],
                ["te", "తెలుగు · Telugu"],
              ] as const).map(([value, title]) => (
                <GroupRow key={value} icon={Languages} title={title} trailing={radio(s.language === value)} onClick={s.language === value ? undefined : () => save({ ...s, language: value })} />
              ))}
            </Group>
            <Group title="Discovery">
              <GroupRow
                icon={MapPin}
                title="Home city"
                subtitle={city ? city : "Showing all cities"}
                trailing={city ? <Button size="sm" variant="ghost" onClick={() => { storage.setCity(""); setCity(""); void queryClient.invalidateQueries(); }}>Clear</Button> : undefined}
              />
            </Group>
          </div>
        )}
      </QueryView>
    </div>
  );
}
