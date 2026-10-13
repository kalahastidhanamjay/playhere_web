export { Logo, LogoMark } from "./Logo";

/** Deterministic gradient pair for crests and avatars, matching the Flutter app's AppColors.seeded. */
export function seededColors(seed: string): [string, string] {
  const pairs: [string, string][] = [
    ["#FF8A3D", "#FF3D5A"],
    ["#7C5CFF", "#4F46E5"],
    ["#22C3EE", "#2563EB"],
    ["#34D399", "#059669"],
    ["#F5B83D", "#EA580C"],
    ["#F472B6", "#DB2777"],
    ["#60A5FA", "#7C3AED"],
    ["#2DD4BF", "#0E7490"],
  ];
  let hash = 7;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  return pairs[hash % pairs.length];
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
