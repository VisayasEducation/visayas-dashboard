"use client";
import { Lead } from "@/lib/api";
import { initials, timeAgo, color } from "@/lib/ui";

const FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "new", label: "New" },
  { key: "engaged", label: "Engaged" },
  { key: "eligible", label: "Eligible" },
  { key: "docs", label: "Docs" },
  { key: "requisition_due", label: "Requisition" },
  { key: "noa", label: "NOA" },
  { key: "payment_due", label: "Payment" },
  { key: "converted", label: "Converted" },
];

export default function ConversationList({
  leads,
  counts,
  total,
  filter,
  currentId,
  onFilter,
  onSelect,
  sub,
}: {
  leads: Lead[];
  counts: Record<string, number>;
  total: number;
  filter: string | null;
  currentId: string | null;
  onFilter: (k: string | null) => void;
  onSelect: (id: string) => void;
  sub: string;
}) {
  return (
    <div className="list">
      <div className="list-head">
        <h2>Conversations</h2>
        <div className="sub">{sub}</div>
      </div>
      <div className="filters">
        {FILTERS.map((f) => {
          const n = f.key ? counts[f.key] || 0 : total;
          return (
            <button
              key={f.label}
              className={filter === f.key ? "on" : ""}
              onClick={() => onFilter(f.key)}
            >
              {f.label} {n}
            </button>
          );
        })}
      </div>
      <div className="rows">
        {leads.length === 0 && <div className="spin">No conversations here.</div>}
        {leads.map((l) => {
          const st = l.state || "new";
          return (
            <div
              key={l.id}
              className={`row ${currentId === l.id ? "on" : ""}`}
              onClick={() => onSelect(l.id)}
            >
              <div className="fp" style={{ background: color(l.id) }}>
                {initials(l.name, l.phone)}
              </div>
              <div className="body">
                <div className="r1">
                  <span className="rname">{l.name || l.phone || "Unknown"}</span>
                  <span className="rtime">{timeAgo(l.updated_at)}</span>
                </div>
                <div className="rsnip">
                  {l.concern ? `Concern: ${l.concern}` : l.city || l.source || "—"}
                </div>
                <div>
                  {st === "noa" && !l.requisition_sent ? (
                    <span className="rtag" style={{ background: "#eef2fb", color: "#3b5bdb" }}>requisition due</span>
                  ) : (
                    <span className={`rtag ${st}`}>{st.replace(/_/g, " ")}</span>
                  )}
                  {l.driven_by === "human" ? (
                    <span className="rdrv human">● human</span>
                  ) : (
                    <span className="rdrv">Maya</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
