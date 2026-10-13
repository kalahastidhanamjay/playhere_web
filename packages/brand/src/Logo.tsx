import { useId } from "react";

/** The PlayHere mark: a location pin with a play button, for any sport played near you. */
export function LogoMark({ size = 36, title = "PlayHere" }: { size?: number; title?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9A4D" />
          <stop offset="0.45" stopColor="#FF6B2C" />
          <stop offset="1" stopColor="#FF3D5A" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${id})`} />
      <path d="M24 40s-12.5-11.6-12.5-20a12.5 12.5 0 0 1 25 0C36.5 28.4 24 40 24 40Z" fill="#fff" />
      <path d="M21 14.6v10.8a.9.9 0 0 0 1.4.8l8.4-5.4a.9.9 0 0 0 0-1.6l-8.4-5.4a.9.9 0 0 0-1.4.8Z" fill={`url(#${id})`} />
    </svg>
  );
}

/** Mark plus wordmark. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 800, fontSize: size * 0.62, letterSpacing: "-0.02em", color: "inherit" }}>PlayHere</span>
    </span>
  );
}
