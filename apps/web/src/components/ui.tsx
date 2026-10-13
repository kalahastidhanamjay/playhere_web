import { initials, seededColors } from "@playhere/brand";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, WifiOff, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ApiError } from "@/lib/api";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

// ------------------------------------------------------------------ buttons

type Variant = "primary" | "secondary" | "tonal" | "ghost" | "danger" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  trailing?: LucideIcon;
}

export function Button({ variant = "primary", size = "md", block, loading, icon: Icon, trailing: Trailing, children, className, disabled, ...rest }: ButtonProps) {
  const iconSize = size === "sm" ? 15 : 18;
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, block && "btn-block", className)}
    >
      {loading ? <span className="spinner" aria-hidden /> : Icon && <Icon size={iconSize} aria-hidden />}
      {children}
      {Trailing && !loading && <Trailing size={iconSize} aria-hidden />}
    </button>
  );
}

/** Router link styled as a button. */
export function ButtonLink({ to, variant = "primary", size = "md", block, icon: Icon, children }: { to: string; variant?: Variant; size?: "sm" | "md" | "lg"; block?: boolean; icon?: LucideIcon; children: ReactNode }) {
  return (
    <Link to={to} className={cx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, block && "btn-block")}>
      {Icon && <Icon size={size === "sm" ? 15 : 18} aria-hidden />}
      {children}
    </Link>
  );
}

export function IconButton({ icon: Icon, label, badge, onClick, to }: { icon: LucideIcon; label: string; badge?: number; onClick?: () => void; to?: string }) {
  const content = (
    <>
      <Icon size={19} aria-hidden />
      {!!badge && <span className="badge">{badge > 9 ? "9+" : badge}</span>}
    </>
  );
  return to ? (
    <Link to={to} className="icon-btn" aria-label={label} title={label}>
      {content}
    </Link>
  ) : (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>
      {content}
    </button>
  );
}

// ------------------------------------------------------------------ pills

type Tone = "neutral" | "live" | "success" | "warning" | "danger" | "info" | "accent" | "brand" | "glass";

export function Pill({ tone = "neutral", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={cx("pill", tone !== "neutral" && `pill-${tone}`)}>
      {tone === "live" ? <span className="live-dot" aria-hidden /> : Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  );
}

/** Maps backend status strings to a labelled pill. */
export function StatusPill({ status }: { status: string }) {
  const s = (status ?? "").toUpperCase();
  const map: Record<string, [Tone, string]> = {
    LIVE: ["live", "LIVE"],
    SCHEDULED: ["info", "Upcoming"],
    UPCOMING: ["info", "Upcoming"],
    COMPLETED: ["success", "Completed"],
    ABANDONED: ["danger", "Abandoned"],
    CANCELLED: ["danger", "Cancelled"],
    DRAFT: ["neutral", "Draft"],
    APPROVED: ["success", "Verified"],
    ACCEPTED: ["success", "Accepted"],
    ACTIVE: ["success", "Approved"],
    PENDING: ["warning", "Pending"],
    UNDER_REVIEW: ["warning", "Under review"],
    SUBMITTED: ["warning", "Submitted"],
    MORE_INFORMATION_REQUIRED: ["warning", "Info needed"],
    REJECTED: ["danger", "Rejected"],
    SUSPENDED: ["danger", "Suspended"],
    EXPIRED: ["danger", "Expired"],
  };
  const [tone, label] = map[s] ?? ["neutral", s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")];
  return <Pill tone={tone}>{label}</Pill>;
}

// ------------------------------------------------------------------ identity

function gradient(seed: string): CSSProperties {
  const [a, b] = seededColors(seed);
  return { background: `linear-gradient(135deg, ${a}, ${b})` };
}

export function Avatar({ name, src, size = 44, ring }: { name: string; src?: string | null; size?: number; ring?: boolean }) {
  const style: CSSProperties = { width: size, height: size, fontSize: size * 0.36, ...gradient(name) };
  const inner = src?.startsWith("http") ? (
    <img className="avatar" src={src} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="avatar" style={style} aria-hidden>
      {initials(name)}
    </span>
  );
  if (!ring) return inner;
  return (
    <span style={{ padding: 3, borderRadius: "50%", background: "var(--brand-gradient)", display: "inline-flex", flex: "none" }}>
      <span style={{ padding: 2, borderRadius: "50%", background: "var(--bg)", display: "inline-flex" }}>{inner}</span>
    </span>
  );
}

export function Crest({ name, logo, size = 44 }: { name: string; logo?: string | null; size?: number }) {
  const radius = size * 0.3;
  if (logo?.startsWith("http")) {
    return <img className="crest" src={logo} alt="" style={{ width: size, height: size, borderRadius: radius }} />;
  }
  const [, b] = seededColors(name);
  return (
    <span
      className="crest"
      aria-hidden
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.34, boxShadow: `0 8px 16px -8px ${b}`, ...gradient(name) }}
    >
      {initials(name)}
    </span>
  );
}

export function IconTile({ icon: Icon, size = 44, colors }: { icon: LucideIcon; size?: number; colors?: [string, string] }) {
  const [a, b] = colors ?? ["#FF9A4D", "#FF3D5A"];
  return (
    <span
      className="icon-tile"
      aria-hidden
      style={{ width: size, height: size, borderRadius: size * 0.32, background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: `0 10px 20px -10px ${b}` }}
    >
      <Icon size={size * 0.5} />
    </span>
  );
}

// ------------------------------------------------------------------ states

export function Skeleton({ height = 80, width, radius }: { height?: number; width?: number | string; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden />;
}

export function SkeletonList({ count = 4, height = 88 }: { count?: number; height?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, message, action }: { icon: LucideIcon; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ring">
        <Icon size={32} aria-hidden />
      </div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = ApiError.from(error);
  return (
    <Empty
      icon={e.kind === "network" ? WifiOff : AlertCircle}
      title={e.kind === "network" ? "You're offline" : "Something went wrong"}
      message={e.message}
      action={onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    />
  );
}

/** Loading / error / data for a TanStack query. Keeps showing data while refetching. */
export function QueryView<T>({ query, loading, children }: { query: UseQueryResult<T>; loading?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.isError) return <ErrorView error={query.error} onRetry={() => void query.refetch()} />;
  return <>{loading ?? <SkeletonList />}</>;
}

// ------------------------------------------------------------------ layout helpers

export interface Crumb {
  label: string;
  to: string;
}

const HOME: Crumb = { label: "Home", to: "/" };
const MATCHES: Crumb = { label: "Matches", to: "/matches" };
const TOURNAMENTS: Crumb = { label: "Tournaments", to: "/tournaments" };
const ME: Crumb = { label: "Me", to: "/me" };
const SETTINGS: Crumb = { label: "Settings", to: "/settings" };

/** Where a page sits in the site, from its URL. The page's own title is appended as the last crumb. */
function parentsOf(path: string): Crumb[] {
  if (/^\/(matches\/|quick-match)/.test(path)) return [HOME, MATCHES];
  if (/^\/tournaments\/.+/.test(path)) return [HOME, TOURNAMENTS];
  if (/^\/(teams|players)\/.+/.test(path) || path === "/me/player") return [HOME, ME];
  if (/^\/settings\/.+/.test(path)) return [HOME, ME, SETTINGS];
  if (path === "/settings" || path === "/offers") return [HOME, ME];
  if (/^\/venues\/.+/.test(path)) return [HOME, { label: "Grounds & courts", to: "/venues" }];
  if (/^\/organizations\/.+/.test(path)) return [HOME, { label: "Organisations", to: "/organizations" }];
  return [HOME];
}

/** "Home › Tournaments › Tirupati Cup". Pass `trail` to override the parents worked out from the URL. */
export function Breadcrumbs({ current, trail }: { current: ReactNode; trail?: Crumb[] }) {
  const location = useLocation();
  const parents = trail ?? parentsOf(location.pathname);
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {parents.map((c) => (
        <span key={c.to} className="row" style={{ "--gap": "6px" } as CSSProperties}>
          <Link to={c.to}>{c.label}</Link>
          <ChevronRight size={14} aria-hidden />
        </span>
      ))}
      <span aria-current="page" className="truncate">{current}</span>
    </nav>
  );
}

/**
 * Page title block. `back` (kept for older call sites) now shows breadcrumbs: on the web a page
 * says where it lives in the site rather than offering a phone-style Back button.
 */
export function PageHeader({ title, subtitle, actions, back, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: boolean | string; crumbs?: Crumb[] }) {
  return (
    <>
      {(back || crumbs) && <Breadcrumbs current={title} trail={crumbs} />}
      <header className="page-head">
        <div className="stack" style={{ "--gap": "4px" } as CSSProperties}>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </header>
    </>
  );
}

export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="faint small">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SeeAll({ to, label = "See all" }: { to: string; label?: string }) {
  return (
    <Link to={to} className="link row" style={{ "--gap": "2px" } as CSSProperties}>
      {label} <ChevronRight size={16} aria-hidden />
    </Link>
  );
}

export function StatTile({ value, label, hot }: { value: ReactNode; label: string; hot?: boolean }) {
  return (
    <div className={cx("stat-tile", hot && "hot")}>
      <span className="num">{value}</span>
      <span className="faint small">{label}</span>
    </div>
  );
}

// ------------------------------------------------------------------ grouped list

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="stack" style={{ "--gap": "8px" } as CSSProperties}>
      {title && <span className="label" style={{ paddingInline: 4 }}>{title}</span>}
      <div className="group">{children}</div>
    </div>
  );
}

interface GroupRowProps {
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  color?: string;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

export function GroupRow({ icon: Icon, title, subtitle, color = "var(--brand)", trailing, to, onClick, danger }: GroupRowProps) {
  const tint = danger ? "var(--danger)" : color;
  const body = (
    <>
      <span className="group-icon" style={{ background: `color-mix(in srgb, ${tint} 15%, transparent)`, color: tint }}>
        <Icon size={17} aria-hidden />
      </span>
      <span className="grow stack" style={{ "--gap": "1px" } as CSSProperties}>
        <span className={cx("truncate", danger && "danger-text")} style={{ fontWeight: 700 }}>{title}</span>
        {subtitle && <span className="faint small truncate">{subtitle}</span>}
      </span>
      {trailing ?? ((to || onClick) && <ChevronRight size={18} className="faint" aria-hidden />)}
    </>
  );
  if (to) return <Link to={to} className="group-row">{body}</Link>;
  if (onClick) return <button type="button" className="group-row" onClick={onClick}>{body}</button>;
  return <div className="group-row">{body}</div>;
}

export { cx };
