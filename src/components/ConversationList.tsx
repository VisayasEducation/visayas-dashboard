"use client";
import { Lead } from "@/lib/api";
import { timeAgo } from "@/lib/ui";

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

import { useEffect, useRef, useState } from "react";

export default function ConversationList({
  leads,
  counts,
  total,
  filter,
  currentId,
  onFilter,
  onSelect,
}: {
  leads: Lead[];
  counts: Record<string, number>;
  total: number;
  filter: string | null;
  currentId: string | null;
  onFilter: (k: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const visible = q.trim()
    ? leads.filter((l) =>
        (l.name || "").toLowerCase().includes(q.trim().toLowerCase()) ||
        (l.phone || "").includes(q.trim()))
    : leads;

  // redesign v1: the list answers "who acts next". Priority: requisition > human driving.
  // (Flagged-document reason needs a board-endpoint field — deferred to the backend pass.)
  const reason = (l: Lead): string | null => {
    if (l.state === "noa" && !l.requisition_sent) return "Requisition ready to send";
    if (l.driven_by === "human") return "You're replying — Maya is paused";
    return null;
  };
  const tok = (l: Lead): string => {
    const st = l.state || "new";
    if (st === "docs") return `Docs ${l.docs_done ?? 0}/${l.docs_total ?? 5}`;
    if (st === "noa") return "Awaiting NOA";
    if (st === "payment_due") return "Payment due";
    if (st === "converted") return "Done";
    return st.replace(/_/g, " ");
  };
  const needs = visible.filter((l) => reason(l));
  const handled = visible.filter((l) => !reason(l));
  const Row = (l: Lead, r: string | null) => (
    <div
      key={l.id}
      className={`row ${currentId === l.id ? "on" : ""} ${l.state === "converted" ? "muted" : ""}`}
      onClick={() => onSelect(l.id)}
    >
      <div className="body">
        <div className="r1">
          <span className="rname">{l.name || l.phone || "Unknown"}</span>
          <span className="rtime">{timeAgo(l.updated_at)}</span>
        </div>
        {r ? (
          <div className="reason">{r}</div>
        ) : (
          <div className="r2">
            <span className="rsnip">
              {l.concern ? `Concern: ${l.concern}` : l.city || l.source || "—"}
            </span>
            <span className="tok">{tok(l)}</span>
          </div>
        )}
      </div>
    </div>
  );
  return (
    <div className="list">
      <div className="search">
        <div className="sbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${total} students`}
          />
        </div>
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
        {visible.length === 0 && <div className="spin">No conversations here.</div>}
        {needs.length > 0 && (
          <div className="sec you">
            <span className="needdot" />Needs you <span className="sn">{needs.length}</span>
          </div>
        )}
        {needs.map((l) => Row(l, reason(l)))}
        {handled.length > 0 && (
          <div className="sec">
            Maya&apos;s handling <span className="sn">{handled.length}</span>
          </div>
        )}
        {handled.map((l) => Row(l, null))}
      </div>
    </div>
  );
}
