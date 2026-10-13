import { AtSign, Bell, KeyRound, Lock, LogOut, ShieldCheck, ShieldHalf, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { useFeedback } from "@/components/overlay";
import { Avatar, Group, GroupRow, PageHeader } from "@/components/ui";
import { useProfile } from "@/data/account";
import { displayName } from "@/domain/cricket";
import { fmt, parseDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { ThemePicker } from "./ThemePicker";

/** Account, security and app preferences (behind the gear on Me). */
export default function SettingsPage() {
  const { account, signOut } = useSession();
  const profile = useProfile().data;
  const { confirm, toast } = useFeedback();
  const navigate = useNavigate();
  if (!account) return null;

  return (
    <div className="page page-narrow">
      <PageHeader back title="Settings" />
      <div className="stack" style={{ gap: 24 }}>
        <Group>
          <GroupRow
            icon={UserRound}
            to="/settings/account"
            title={
              <span className="row">
                <Avatar name={displayName(account)} src={profile?.profilePhotoUrl} size={44} />
                <span className="stack" style={{ gap: 0 }}>
                  <span>{displayName(account)}</span>
                  <span className="faint small" style={{ fontWeight: 500 }}>{account.email}</span>
                </span>
              </span>
            }
            subtitle={account.createdAt ? `Member since ${fmt.date(parseDate(account.createdAt))}` : undefined}
          />
        </Group>
        <Group title="Account & security">
          <GroupRow icon={UserRound} title="Name & personal details" to="/settings/account" />
          <GroupRow icon={AtSign} title="Change email" subtitle={account.email} to="/settings/email" />
          <GroupRow icon={Lock} title="Change password" to="/settings/password" />
          <GroupRow icon={KeyRound} title="Forgot password?" subtitle="Reset it with a code sent to your email" to="/forgot-password" />
        </Group>
        <ThemePicker />
        <Group title="Preferences">
          <GroupRow icon={Bell} title="Notifications" to="/settings/notifications" />
          <GroupRow icon={ShieldHalf} title="Privacy & language" to="/settings/privacy" />
          {account.roles.includes("SUPER_ADMIN") && (
            <GroupRow icon={ShieldCheck} title="Admin console" subtitle="Review organisation verifications" color="var(--warning)" to="/admin" />
          )}
        </Group>
        <Group>
          <GroupRow
            icon={LogOut}
            title="Sign out"
            danger
            onClick={async () => {
              if (await confirm({ title: "Sign out?", message: "You'll need your email and password (or an email code) to sign back in.", confirmLabel: "Sign out", destructive: true })) {
                signOut();
                toast("info", "Signed out");
                navigate("/");
              }
            }}
          />
        </Group>
        <p className="faint tiny" style={{ textAlign: "center" }}>PlayHere Web · v1.0.0</p>
      </div>
    </div>
  );
}
