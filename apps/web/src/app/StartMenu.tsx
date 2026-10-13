import { ChevronRight, QrCode, Trophy, Users, type LucideIcon } from "lucide-react";
import { Whistle } from "@/components/icons";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Dialog } from "@/components/overlay";
import { Button, IconTile } from "@/components/ui";
import { TextInput } from "@/components/forms";
import { useSession } from "@/lib/session";

const OPTIONS: { icon: LucideIcon; title: string; body: string; to: string; colors: [string, string] }[] = [
  { icon: Whistle, title: "Quick match", body: "Any sport, scored live", to: "/quick-match", colors: ["#FF9A4D", "#FF3D5A"] },
  { icon: Users, title: "New team", body: "Get an invite link for your squad", to: "/teams/new", colors: ["#7C5CFF", "#4F46E5"] },
  { icon: Trophy, title: "Host a tournament", body: "League or knockout with a live table", to: "/tournaments/new", colors: ["#22C3EE", "#2563EB"] },
];

/** The ＋ Start menu: every "create" action in one place. */
export function StartMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { account } = useSession();
  const [code, setCode] = useState("");
  const [askCode, setAskCode] = useState(false);

  const go = (to: string) => {
    onClose();
    setAskCode(false);
    navigate(account ? to : `/login?from=${encodeURIComponent(to)}`);
  };

  return (
    <Dialog open={open} onClose={() => { setAskCode(false); onClose(); }} title={askCode ? "Join with a code" : "What do you want to start?"}>
      {askCode ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) go(`/join/${code.trim().toUpperCase()}`);
          }}
        >
          <TextInput
            label="Team invite code"
            placeholder="e.g. K7PQ2M"
            value={code}
            onValue={(v) => setCode(v.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12))}
            autoFocus
            icon={QrCode}
          />
          <div className="grid-2">
            <Button variant="secondary" onClick={() => setAskCode(false)}>Other options</Button>
            <Button type="submit" disabled={!code.trim()}>Continue</Button>
          </div>
        </form>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {[...OPTIONS, { icon: QrCode, title: "Join with a code", body: "Got a team invite code? Enter it here", to: "", colors: ["#34D399", "#0E7490"] as [string, string] }].map((o) => (
            <button
              key={o.title}
              type="button"
              className="card card-link row"
              style={{ padding: 12, textAlign: "left", width: "100%" }}
              onClick={() => (o.to ? go(o.to) : setAskCode(true))}
            >
              <IconTile icon={o.icon} size={44} colors={o.colors} />
              <span className="grow stack" style={{ gap: 2 }}>
                <strong>{o.title}</strong>
                <span className="faint small">{o.body}</span>
              </span>
              <ChevronRight size={18} className="faint" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
