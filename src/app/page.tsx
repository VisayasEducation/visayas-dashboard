"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Board, Lead, TimelineEvent, Brain } from "@/lib/api";
import ConversationList from "@/components/ConversationList";
import ThreadPanel from "@/components/ThreadPanel";
import BrainPanel from "@/components/BrainPanel";

const ME = "Counsellor"; // login step replaces this with the signed-in user's name

export default function InboxPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [brain, setBrain] = useState<Brain | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const loadBoard = useCallback(async () => {
    try {
      const b = await api.board();
      setBoard(b);
      setErr(null);
    } catch (e: any) {
      setErr(String(e.message || e).slice(0, 160));
    }
  }, []);

  const openLead = useCallback(async (id: string) => {
    setCurrentId(id);
    try {
      const [d, tl, br] = await Promise.all([
        api.detail(id),
        api.timeline(id),
        api.brain(id).catch(() => null),
      ]);
      setCurrentLead(d.lead);
      setEvents(tl.events || []);
      setBrain(br);
    } catch (e: any) {
      showToast("Couldn't load conversation");
    }
  }, []);

  useEffect(() => {
    loadBoard();
    // 5s polling for near-live updates; real-time push is a tracked later step.
    const t = setInterval(() => {
      loadBoard();
      if (currentId) openLead(currentId); // refresh the open thread too
    }, 5000);
    return () => clearInterval(t);
  }, [loadBoard, currentId, openLead]);

  async function toggleAI() {
    if (!currentLead) return;
    const next = currentLead.driven_by === "human" ? "maya" : "human";
    try {
      await api.takeover(currentLead.id, next, ME);
      showToast(next === "human" ? "You're driving — AI off" : "AI back on");
      await loadBoard();
      await openLead(currentLead.id);
    } catch (e: any) {
      showToast(String(e.message || e).slice(0, 100));
    }
  }

  async function sendMsg(text: string) {
    if (!currentLead) return;
    try {
      await api.send(currentLead.id, text, ME);
      await openLead(currentLead.id);
    } catch (e: any) {
      showToast(String(e.message || e).slice(0, 120));
      throw e;
    }
  }

  // derive the list from the board + filter
  let leads: Lead[] = board ? Object.values(board.board).flat() : [];
  if (filter) leads = leads.filter((l) => l.state === filter);
  leads.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));

  const humanCount = board
    ? Object.values(board.board).flat().filter((l) => l.driven_by === "human").length
    : 0;
  const sub = err
    ? "error loading"
    : board
    ? `${board.total} open · ${humanCount} human-driven`
    : "loading…";

  return (
    <div className="app">
      <div className="top">
        <span className="brand">
          Maya<span className="dot">·</span>Inbox
        </span>
        <div className="biz">
          <button className="on">UV Gullas</button>
        </div>
        <span className="sp" />
        <span className="me">RV</span>
      </div>

      <div className={`main ${currentLead ? "with-brain" : ""}`}>
        <ConversationList
          leads={leads}
          counts={board?.counts || {}}
          total={board?.total || 0}
          filter={filter}
          currentId={currentId}
          onFilter={setFilter}
          onSelect={openLead}
          sub={sub}
        />

        <div className="thread-wrap">
          {err && !board ? (
            <div className="empty">
              Couldn&apos;t reach the backend.
              <br />
              <small>{err}</small>
            </div>
          ) : !currentLead ? (
            <div className="empty">Select a conversation to view it</div>
          ) : (
            <ThreadPanel
              lead={currentLead}
              events={events}
              me={ME}
              onToggleAI={toggleAI}
              onSend={sendMsg}
            />
          )}
        </div>

        {currentLead && <BrainPanel brain={brain} />}
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
