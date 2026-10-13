import { useState } from "react";
import { Link } from "react-router";
import { Empty } from "@/components/ui";
import type { InningsCard, ScorecardData } from "@/domain/models";
import { ClipboardList } from "lucide-react";

/** Full cricket scorecard: one tab per innings with batting, extras, fall of wickets and bowling. */
export function Scorecard({ data, live }: { data: ScorecardData; live: boolean }) {
  const list = data.innings;
  const [pick, setPick] = useState<number | null>(null);
  if (list.length === 0) {
    return <Empty icon={ClipboardList} title="No scorecard yet" message="The scorecard fills in as soon as the first ball is bowled." />;
  }
  // Default to the innings in progress (the latest one).
  const active = list.find((i) => i.inningsNo === pick) ?? list[list.length - 1];
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="seg" role="tablist" aria-label="Innings">
        {list.map((i) => (
          <button key={i.inningsId} type="button" role="tab" aria-selected={i.inningsId === active.inningsId} onClick={() => setPick(i.inningsNo)}>
            {i.battingTeam} · {i.runs}/{i.wickets}
          </button>
        ))}
      </div>
      <InningsTables card={active} live={live} />
    </div>
  );
}

function InningsTables({ card: c, live }: { card: InningsCard; live: boolean }) {
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sc-head">
          <strong>{c.battingTeam} batting</strong>
          <span className="num">{c.runs}/{c.wickets} <span className="faint small">({c.overs} ov)</span></span>
        </div>
        <div className="table-wrap">
          <table className="table sc-table">
            <thead>
              <tr>
                <th>Batter</th>
                <th className="c">R</th>
                <th className="c">B</th>
                <th className="c">4s</th>
                <th className="c">6s</th>
                <th className="c">SR</th>
              </tr>
            </thead>
            <tbody>
              {c.batting.map((b) => (
                <tr key={b.playerId}>
                  <td>
                    <Link to={`/players/${b.playerId}`} className="sc-name">
                      {b.name}
                      {b.onStrike && live ? " *" : ""}
                    </Link>
                    <span className={b.notOut ? "sc-out sc-notout" : "sc-out"}>{b.dismissal}</span>
                  </td>
                  <td className="c num" style={{ fontWeight: 800 }}>{b.runs}</td>
                  <td className="c">{b.balls}</td>
                  <td className="c">{b.fours}</td>
                  <td className="c">{b.sixes}</td>
                  <td className="c faint">{b.strikeRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sc-foot">
          <span>
            <strong>Extras</strong> {c.extras.total}{" "}
            <span className="faint small">(wd {c.extras.wides}, nb {c.extras.noBalls}, b {c.extras.byes}, lb {c.extras.legByes})</span>
          </span>
          <span>
            <strong>Total</strong> <span className="num">{c.runs}/{c.wickets}</span> <span className="faint small">({c.overs} ov)</span>
          </span>
        </div>
        {c.yetToBat.length > 0 && (
          <div className="sc-foot">
            <span><strong>{c.completed ? "Did not bat" : "Yet to bat"}</strong> <span className="muted small">{c.yetToBat.join(", ")}</span></span>
          </div>
        )}
        {c.fallOfWickets.length > 0 && (
          <div className="sc-foot">
            <span>
              <strong>Fall of wickets</strong>{" "}
              <span className="muted small">{c.fallOfWickets.map((f) => `${f.wicket}-${f.score} (${f.name}, ${f.over} ov)`).join(" · ")}</span>
            </span>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sc-head"><strong>{c.bowlingTeam} bowling</strong></div>
        <div className="table-wrap">
          <table className="table sc-table">
            <thead>
              <tr>
                <th>Bowler</th>
                <th className="c">O</th>
                <th className="c">M</th>
                <th className="c">R</th>
                <th className="c">W</th>
                <th className="c">Econ</th>
                <th className="c">WD</th>
                <th className="c">NB</th>
              </tr>
            </thead>
            <tbody>
              {c.bowling.length === 0 ? (
                <tr><td colSpan={8} className="faint">No overs bowled yet</td></tr>
              ) : (
                c.bowling.map((b) => (
                  <tr key={b.playerId}>
                    <td><Link to={`/players/${b.playerId}`} className="sc-name">{b.name}{b.bowling && live ? " *" : ""}</Link></td>
                    <td className="c">{b.overs}</td>
                    <td className="c">{b.maidens}</td>
                    <td className="c">{b.runs}</td>
                    <td className="c num" style={{ fontWeight: 800 }}>{b.wickets}</td>
                    <td className="c faint">{b.economy}</td>
                    <td className="c faint">{b.wides}</td>
                    <td className="c faint">{b.noBalls}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
