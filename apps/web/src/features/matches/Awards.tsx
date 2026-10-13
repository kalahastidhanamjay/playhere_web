import { useQueryClient } from "@tanstack/react-query";
import { Activity, Award as AwardIcon, CircleDot, Hand, PiggyBank, Rocket, Trophy, Zap, type LucideIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { Dialog, useAction } from "@/components/overlay";
import { Avatar, Button, Pill, Section } from "@/components/ui";
import { matchApi, useAwards } from "@/data/matches";
import { Cricket } from "@/components/icons";

const ICONS: Record<string, LucideIcon> = {
  SUPER_STRIKER: Zap,
  MAXIMUM_SIXES: Rocket,
  MOST_FOURS: Activity,
  BEST_BOWLER: Cricket,
  MOST_ECONOMICAL: PiggyBank,
  MOST_DOTS: CircleDot,
  BEST_FIELDER: Hand,
};

/** Player of the Match (chosen or suggested) and IPL-style awards for a finished cricket match. */
export function AwardsSection({ matchId, canEdit }: { matchId: string; canEdit: boolean }) {
  const query = useAwards(matchId);
  const queryClient = useQueryClient();
  const [run, busy] = useAction();
  const [picking, setPicking] = useState(false);
  const data = query.data;
  if (!data || (!data.playerOfMatch && data.awards.length === 0)) return null;
  const potm = data.playerOfMatch;

  const choose = async (playerId: string, name: string) => {
    setPicking(false);
    if (await run(() => matchApi.choosePlayerOfMatch(matchId, playerId), `${name} is player of the match`)) {
      await queryClient.invalidateQueries({ queryKey: ["awards", matchId] });
    }
  };

  return (
    <Section title="Awards">
      <div className="stack" style={{ gap: 12 }}>
        {potm && (
          <div className="card potm">
            <div className="row" style={{ "--gap": "14px" } as CSSProperties}>
              <span className="potm-badge"><Trophy size={22} /></span>
              <span className="grow stack" style={{ gap: 0 }}>
                <span className="potm-label">Player of the match</span>
                <Link to={`/players/${potm.playerId}`} className="potm-name">{potm.name}</Link>
                <span className="small" style={{ color: "rgba(255,255,255,.7)" }}>{potm.teamName}</span>
              </span>
              {!data.chosen && <Pill tone="warning">Suggested</Pill>}
            </div>
            <div className="stack" style={{ gap: 2, marginTop: 12 }}>
              <strong style={{ color: "#fff" }}>{potm.summary}</strong>
              <span className="tiny" style={{ color: "rgba(255,255,255,.6)" }}>Impact {potm.impact}</span>
            </div>
            {canEdit && (
              <div className="row" style={{ marginTop: 14 }}>
                {!data.chosen && <Button size="sm" loading={busy} onClick={() => choose(potm.playerId, potm.name)}>Confirm</Button>}
                <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>{data.chosen ? "Change" : "Pick someone else"}</Button>
              </div>
            )}
          </div>
        )}
        {data.awards.length > 0 && (
          <div className="grid" style={{ "--min": "190px", gap: 10 } as CSSProperties}>
            {data.awards.map((a) => {
              const Icon = ICONS[a.key] ?? AwardIcon;
              return (
                <Link key={a.key} to={`/players/${a.playerId}`} className="card card-link stack" style={{ padding: 14, gap: 6 }} title={a.description}>
                  <span className="row small" style={{ "--gap": "6px", color: "var(--brand)", fontWeight: 700 } as CSSProperties}>
                    <Icon size={16} aria-hidden /> {a.title}
                  </span>
                  <strong className="truncate">{a.name}</strong>
                  <span className="faint small">{a.value}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={picking} onClose={() => setPicking(false)} title="Player of the match">
        <p className="faint small" style={{ marginTop: -8 }}>Ranked by impact: runs, strike rate, wickets, economy, dot balls and fielding.</p>
        <div className="stack" style={{ gap: 4, maxHeight: 420, overflowY: "auto" }}>
          {data.candidates.map((c, i) => (
            <button key={c.playerId} type="button" className="lineup-row" onClick={() => choose(c.playerId, c.name)}>
              <Avatar name={c.name} size={34} />
              <span className="grow stack" style={{ gap: 0, minWidth: 0 }}>
                <strong className="truncate">
                  {c.name} {i === 0 && data.suggestion?.playerId === c.playerId && <Pill tone="brand">Suggested</Pill>}
                </strong>
                <span className="faint small truncate">{c.teamName} · {c.summary}</span>
              </span>
              <span className="num" style={{ color: "var(--brand)" }}>{c.impact}</span>
            </button>
          ))}
        </div>
      </Dialog>
    </Section>
  );
}
