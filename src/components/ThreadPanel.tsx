"use client";
import { useEffect, useRef, useState } from "react";
import { Lead, TimelineEvent } from "@/lib/api";
import { initials, color } from "@/lib/ui";

export default function ThreadPanel({
  lead,
  events,
  me,
  onToggleAI,
  onSend,
}: {
  lead: Lead;
  events: TimelineEvent[];
  me: string;
  onToggleAI: () => void;
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const driving = lead.driven_by === "human";
  const winOpen = lead.window_open;

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [events]);

  async function submit() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await onSend(t);
      setText("");
    } finally {
      setSending(false);
    }
  }

  // group by day + render
  let lastDay = "";
  const rows: JSX.Element[] = [];
  events.forEach((ev, i) => {
    const day = new Date(ev.ts).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (day !== lastDay) {
      rows.push(<div className="daychip" key={`d${i}`}>{day}</div>);
      lastDay = day;
    }
    const t = new Date(ev.ts).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (ev.kind === "message") {
      const d = ev.data;
      if (d.direction === "inbound") {
        rows.push(
          <div className="msg in" key={`m${i}`}>
            {d.body}
            <div className="tm">{t}</div>
          </div>
        );
      } else {
        const human = d.tags && d.tags.human;
        rows.push(
          <div className={`msg out ${human ? "human" : ""}`} key={`m${i}`}>
            <div className="attr">{human || "Maya"}</div>
            {d.body}
            <div className="tm">{t} ✓✓</div>
          </div>
        );
      }
    } else {
      const d = ev.data || {};
      const label =
        d.type === "driver_changed"
          ? `switched to ${d.data?.to === "human" ? "human" : "Maya"}`
          : d.type === "stage_moved"
          ? `stage → ${d.data?.to}`
          : d.type;
      rows.push(<div className="evline" key={`e${i}`}>— {label} —</div>);
    }
  });
  if (events.length === 0) rows.push(<div className="evline" key="none">No messages yet.</div>);

  return (
    <>
      <div className="thread-head">
        <div className="fp" style={{ background: color(lead.id) }}>
          {initials(lead.name, lead.phone)}
        </div>
        <div className="th-id">
          <div className="th-name">{lead.name || lead.phone || "Unknown"}</div>
          <div className="th-meta">
            {lead.phone} · {(lead.state || "new").replace(/_/g, " ")}
            {lead.concern ? ` · concern: ${lead.concern}` : ""}
          </div>
        </div>
        <span className={`win ${winOpen ? "open" : "closed"}`}>
          {winOpen ? "Window open" : "Window closed"}
        </span>
        <div className={`aitoggle ${driving ? "" : "on"}`} onClick={onToggleAI}>
          <span className="lbl">AI</span>
          <span className="sw" />
          <span className="state">{driving ? "OFF · human" : "ON · Maya"}</span>
        </div>
      </div>

      <div className="thread" ref={threadRef}>
        {rows}
      </div>

      <div className="composer">
        {!driving ? (
          <div className="locked">
            AI is answering this chat. Switch AI off (take over) to reply as a human.
          </div>
        ) : !winOpen ? (
          <div className="locked warn">
            24-hour window closed — an approved template is needed (coming later).
          </div>
        ) : (
          <div className="cbox">
            <textarea
              value={text}
              placeholder={`Message ${lead.name || lead.phone || ""}…`}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
            />
            <button onClick={submit} disabled={sending || !text.trim()}>
              {sending ? "…" : "Send"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
