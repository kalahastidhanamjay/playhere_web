import { LogoMark } from "@playhere/brand";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { SPORTS } from "@/domain/sports";

const POINTS = [
  "Score any match live in 12 sports",
  "Run leagues and knockouts with automatic fixtures",
  "One profile for every sport you play",
];

/**
 * Sign-in, sign-up and recovery screens: a brand panel beside the form on desktop, just the form
 * on phones. The logo leads home; there is no Back button.
 */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-brand" aria-hidden>
        <Link to="/" className="auth-logo" tabIndex={-1}>
          <LogoMark size={40} /> PlayHere
        </Link>
        <div className="auth-pitch">
          <h2>
            Every game, every sport, <em>live.</em>
          </h2>
          <ul>
            {POINTS.map((p) => (
              <li key={p}><Check size={18} /> {p}</li>
            ))}
          </ul>
        </div>
        <div className="auth-sports">
          {SPORTS.map((s) => (
            <span key={s.id} className="auth-sport" title={s.name} style={{ background: `linear-gradient(135deg, ${s.colors[0]}, ${s.colors[1]})` }}>
              <s.icon size={20} />
            </span>
          ))}
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" aria-label="PlayHere home" className="auth-card-logo"><LogoMark size={44} /></Link>
          <div className="stack" style={{ gap: 8 }}>
            <h1>{title}</h1>
            <p className="muted" style={{ fontSize: 16 }}>{subtitle}</p>
          </div>
          {children}
          {footer}
          <Link to="/" className="auth-guest">Browse PlayHere as a guest</Link>
        </div>
      </main>
    </div>
  );
}

export const safeFrom = (from: string | null) => (from && from.startsWith("/") && !from.startsWith("//") ? from : "/");
