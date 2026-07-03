// src/lib/ui.ts — small presentation helpers shared by components.

export function initials(name?: string | null, phone?: string | null): string {
  if (name) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
  }
  return (phone || "?").slice(-2);
}

export function timeAgo(ts?: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const PALETTE = ["#0c6e46", "#2e5f9e", "#6650b8", "#9a6700", "#a13d34", "#3a7d6e"];
export function color(id?: string): string {
  const h = [...(id || "x")].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[h % PALETTE.length];
}
