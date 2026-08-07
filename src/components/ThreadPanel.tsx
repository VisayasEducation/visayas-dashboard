"use client";
import { useEffect, useRef, useState } from "react";
import { Lead, TimelineEvent, claimHandoff, reopenChat } from "@/lib/api";
import RequisitionBanner from "@/components/RequisitionBanner";
import { initials, color, waitedMin } from "@/lib/ui";

// Pull a YouTube video id out of watch?v=, youtu.be/, or /shorts/ URLs.
function ytId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

// Best-effort file extension (for the little type chip on a document card).
function fileExt(url: string, fallback = "FILE"): string {
  try {
    const clean = url.split("?")[0].split("#")[0];
    const ext = clean.substring(clean.lastIndexOf(".") + 1).toUpperCase();
    return clean.includes(".") && ext.length >= 1 && ext.length <= 4 ? ext : fallback;
  } catch {
    return fallback;
  }
}

// One media item, rendered like WhatsApp: image, audio, video, a YouTube
// thumbnail card, a generic link card, or a document card. Display only —
// the backend already logs every item; this just renders it richly.
function MediaBlock({ d }: { d: any }) {
  const url: string | undefined = d.media_url;
  if (!url) return null;

  // link (usually YouTube) -> thumbnail card, else a generic link card
  if (d.msg_type === "text_link" || d.msg_type === "youtube_link") {
    const id = ytId(url);
    const caption = d.tags?.caption;
    let host = "link";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
    if (id) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="media-yt">
          <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" />
          <div className="yt-meta">
            <div className="yt-title">{caption || "Watch video"}</div>
            <div className="yt-host"><span className="yt-play">▶</span> youtube.com</div>
          </div>
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noreferrer" className="media-doc">
        <span className="chip link">↗</span>
        <span className="nm">{caption || host}</span>
        <span className="op">Open ↗</span>
      </a>
    );
  }

  if (d.msg_type === "image")
    return (
      <a href={url} target="_blank" rel="noreferrer" className="media-img">
        <img src={url} alt="sent media" />
      </a>
    );
  if (d.msg_type === "audio")
    return <audio className="media-audio" controls src={url} />;
  if (d.msg_type === "video")
    return <video className="media-video" controls src={url} />;

  // document / pdf card -- red type chip + filename + Open
  const name = d.tags?.caption || d.tags?.filename || "Document";
  const ext = fileExt(url, "FILE");
  return (
    <a href={url} target="_blank" rel="noreferrer" className="media-doc">
      <span className={`chip ${ext === "PDF" ? "pdf" : ""}`}>{ext}</span>
      <span className="nm">{name}</span>
      <span className="op">Open ↗</span>
    </a>
  );
}

// "19h" / "42m" left in the Meta messaging window (window_seconds_left from the backend)
function fmtLeft(s?: number): string {
  const v = Math.max(0, s || 0);
  if (v >= 3600) return `${Math.floor(v / 3600)}h`;
  return `${Math.max(1, Math.floor(v / 60))}m`;
}

function MsgStatus({ status }: { status?: string }) {
  if (status === "failed") return <span className="tick fail" title="Not delivered">⚠</span>;
  if (status === "sent") return <span className="tick" title="Sent">✓</span>;
  if (status === "delivered") return <span className="tick" title="Delivered">✓✓</span>;
  if (status === "read") return <span className="tick read" title="Read">✓✓</span>;
  return null;
}

export default function ThreadPanel({
  lead,
  events,
  me,
  onToggleAI,
  onSend,
  onBack,
  onOpenBrain,
  onOpenRequisition,
  noaIssuedBy,
}: {
  lead: Lead;
  events: TimelineEvent[];
  me: string;
  onToggleAI: () => void;
  onSend: (text: string) => Promise<void>;
  onBack: () => void;
  onOpenBrain: () => void;
  onOpenRequisition?: () => void;
  noaIssuedBy?: "college" | "us";
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);   // are we currently near the bottom?

  const driving = lead.driven_by === "human";
  const winOpen = lead.window_open;

  // remember whether the user is near the bottom, updated as they scroll
  function handleScroll() {
    const el = threadRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80; // 80px tolerance
  }

  // only jump to the bottom on new messages if they were already at the bottom
  useEffect(() => {
    if (atBottomRef.current && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
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
  const rows: React.ReactElement[] = [];
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
      const media = d.media_url ? <MediaBlock d={d} /> : null;
      if (d.direction === "inbound") {
        rows.push(
          <div className="msg in" key={`m${i}`}>
            {media}
            {d.body}
            <div className="tm">{t}</div>
          </div>
        );
      } else {
        const human = d.tags && d.tags.human;
        const btns: string[] = Array.isArray(d.tags?.buttons) ? d.tags.buttons : [];
        rows.push(
          <div className={`msg out ${human ? "human" : ""}`} key={`m${i}`}>
            <div className="attr">{human || "Maya"}</div>
            {media}
            {d.body}
            {btns.length > 0 && (
              <div className="tpl-btns">
                {btns.map((b, j) => <span className="tpl-btn" key={j}>{b}</span>)}
              </div>
            )}
            <div className="tm">{t} <MsgStatus status={d.status} /></div>
          </div>
        );
      }
    } else {
      const d = ev.data || {};
      // event detail can arrive as a nested object OR a JSON string — handle both
      let det: any = d.data;
      if (typeof det === "string") { try { det = JSON.parse(det); } catch { det = {}; } }
      det = det || {};
      const to = det.to ?? d.to;
      const label =
        d.type === "driver_changed"
          ? `switched to ${to === "human" ? "human" : "Maya"}`
          : d.type === "stage_moved"
          ? `stage → ${to || "?"}`
          : d.type;
      rows.push(<div className="evline" key={`e${i}`}>— {label} —</div>);
    }
  });
  if (events.length === 0) rows.push(<div className="evline" key="none">No messages yet.</div>);

  return (
    <>
      <div className="thread-head">
        <button className="thread-back" onClick={onBack} aria-label="Back to list">←</button>
        <div className="fp" style={{ background: `${color(lead.id)}1f`, color: color(lead.id) }}>
          {initials(lead.name, lead.phone)}
        </div>
        <div className="th-id">
          <div className="th-name">{lead.name || lead.phone || "Unknown"}</div>
          <div className="th-meta">
            {lead.phone} · <span className={`pdot ${!winOpen ? "closed" : driving ? "off" : ""}`} />{" "}
            {!winOpen
              ? "Conversation window closed"
              : driving
              ? "You're driving — Maya is paused"
              : `Maya is replying · window closes in ${fmtLeft(lead.window_seconds_left)}`}
          </div>
        </div>
        <div className={`aitoggle ${driving ? "" : "on"}`} onClick={onToggleAI}
             title="Who replies to this family">
          <span className="lbl">{driving ? "You" : "Maya"}</span>
          <span className="sw" />
        </div>
        <button className="thread-lead" onClick={onOpenBrain}>ⓘ Lead</button>
        <button className="thread-x" onClick={onBack} aria-label="Close conversation">✕</button>
      </div>

      {noaIssuedBy !== "us" && lead.state === "noa" && !lead.requisition_sent
        && onOpenRequisition && (
        <RequisitionBanner name={lead.name} onOpen={onOpenRequisition} />
      )}

      <div className="thread" ref={threadRef} onScroll={handleScroll}>
        {lead.handoff_waiting && (
          <div className="hbanner">
            <div className="hicon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                   strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
              </svg>
            </div>
            <div className="htext">
              <div className="htitle">
                {(lead.name || "This family").split(" ")[0]} asked for a person
              </div>
              <div className="hsub">
                Waiting {waitedMin(lead.handoff_at)} min
                {lead.handoff_pinged ? ` · ${lead.handoff_pinged} was pinged` : ""}.
                {" "}Asked to speak to a counsellor.
              </div>
            </div>
            <button
              className="claimbtn"
              onClick={async () => {
                try {
                  await claimHandoff(lead.id, me);
                  location.reload();
                } catch (e) {
                  alert("Could not claim this chat: " + String(e));
                }
              }}
            >
              I&apos;ve got this
            </button>
          </div>
        )}
        {rows}
      </div>

      <div className="composer">
        {!driving ? (
          <div className="locked">
            Maya is answering this chat.{" "}
            <span className="lk" onClick={onToggleAI}>Take over</span> to reply yourself.
          </div>
        ) : !winOpen ? (
          <div className="locked warn">
            Messaging window closed.
            <button className="claimbtn" onClick={async () => {
              const ta = confirm("OK for Tanglish, Cancel for English");
              try {
                await reopenChat(lead.id, ta ? "tanglish" : "english", me);
                alert("Reopen message sent. The chat unlocks when they reply.");
                location.reload();
              } catch (e) {
                alert("Could not send it: " + String(e));
              }
            }}>
              Reopen conversation
            </button>
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
