const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Backend LocalDate/LocalDateTime strings have no zone; read them as local time. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const fmt = {
  money: (v: number | null | undefined) => (v == null ? "—" : money.format(v)),
  moneyCompact: (v: number | null | undefined) => (!v ? "—" : v < 100000 ? money.format(v) : compactMoney.format(v)),
  date: (d: Date | null) => (d ? fullDate.format(d) : "TBD"),
  shortDate: (d: Date | null) => (d ? dayMonth.format(d) : "TBD"),
  time: (d: Date | null) => (d ? timeFmt.format(d) : ""),

  dateRange(start: Date | null, end: Date | null) {
    if (!start) return "Dates TBD";
    if (!end || start.toDateString() === end.toDateString()) return fullDate.format(start);
    if (start.getFullYear() === end.getFullYear()) {
      return start.getMonth() === end.getMonth()
        ? `${start.getDate()}–${fullDate.format(end)}`
        : `${dayMonth.format(start)} – ${fullDate.format(end)}`;
    }
    return `${fullDate.format(start)} – ${fullDate.format(end)}`;
  },

  /** "Today · 6:30 pm", "Tomorrow · 10:00 am", "Sat, 12 Oct · 10:00 am" */
  matchTime(d: Date | null) {
    if (!d) return "Time TBD";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return `Today · ${timeFmt.format(d)}`;
    if (diff === 1) return `Tomorrow · ${timeFmt.format(d)}`;
    if (diff === -1) return `Yesterday · ${timeFmt.format(d)}`;
    return `${weekday.format(d)} · ${timeFmt.format(d)}`;
  },

  relative(d: Date | null) {
    if (!d) return "";
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return dayMonth.format(d);
  },

  countdown(d: Date | null) {
    if (!d) return "";
    const days = Math.floor((d.getTime() - Date.now()) / 86400000);
    if (days < 0) return "Closed";
    if (days === 0) return "Closes today";
    return days === 1 ? "1 day left" : `${days} days left`;
  },

  /** RIGHT_ARM_FAST -> "Right arm fast" */
  label(value: string | null | undefined) {
    if (!value) return "—";
    const s = value.toLowerCase().replace(/_/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  overs(overs: number) {
    const whole = Math.trunc(overs);
    const balls = Math.round((overs - whole) * 10);
    return balls === 0 ? `${whole}` : `${whole}.${balls}`;
  },

  /** Cricket overs notation (12.4) to legal balls. */
  oversToBalls(overs: number) {
    const whole = Math.trunc(overs);
    return whole * 6 + Math.round((overs - whole) * 10);
  },

  runRate(runs: number, overs: number) {
    const balls = fmt.oversToBalls(overs);
    return balls === 0 ? "0.00" : ((runs * 6) / balls).toFixed(2);
  },
};
