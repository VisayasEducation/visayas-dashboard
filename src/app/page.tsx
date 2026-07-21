"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Board, Lead, TimelineEvent, Brain, Session } from "@/lib/api";
import ConversationList from "@/components/ConversationList";
import ThreadPanel from "@/components/ThreadPanel";
import BrainPanel from "@/components/BrainPanel";
import ResultsScreen from "@/components/ResultsScreen";
import RequisitionBanner from "@/components/RequisitionBanner";
import RequisitionModal from "@/components/RequisitionModal";

const ME = "Counsellor"; // login step replaces this with the signed-in user's name

export default function InboxPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [brain, setBrain] = useState<Brain | null>(null);
  const [brainOpen, setBrainOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [screen, setScreen] = useState<"chats" | "results">("chats");
  const [sess, setSess] = useState<Session | null>(null);
  const [bizOpen, setBizOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("maya_token")) {
      location.href = "/login";
      return;
    }
    api.sessionMe().then(setSess).catch((e) => console.error("session/me failed", e));
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.(".biz-switch")) setBizOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
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

  const switchCollege = async (business_id: string) => {
    setBizOpen(false);
    if (switching || business_id === sess?.active_business?.business_id) return;
    setSwitching(true);
    try {
      const r = await api.switchBusiness(business_id);
      localStorage.setItem("maya_token", r.token); // BEFORE any refetch
      setSess(r);
      // old college's lead ids 404 under the new token — clear, then reload
      setCurrentId(null); setCurrentLead(null); setEvents([]); setBrain(null);
      setFilter(null); setBoard(null);
      loadBoard();
      showToast(`Switched to ${r.active_business?.display_name || ""}`);
    } catch (e: any) {
      showToast(String(e.message || e).slice(0, 120)); // loud, stay put
    } finally {
      setSwitching(false);
    }
  };

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
  const isReqDue = (l: Lead) => l.state === "noa" && !l.requisition_sent;
  if (filter === "requisition_due") {
    leads = leads.filter(isReqDue);
  } else if (filter) {
    leads = leads.filter((l) => l.state === filter);
  }
  leads.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  const reqDueCount = board
    ? Object.values(board.board).flat().filter(isReqDue).length
    : 0;

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
        {sess && sess.memberships.length > 1 ? (
          <span className="biz-switch">
            <button className="biz-pill" disabled={switching}
                    onClick={() => setBizOpen((v) => !v)}>
              {sess.active_business?.display_name || "Select college"}
              <span className="chev">{switching ? "…" : "▾"}</span>
            </button>
            {bizOpen && (
              <span className="biz-menu">
                {sess.memberships.map((b) => (
                  <button key={b.business_id}
                          className={`biz-item ${b.business_id === sess.active_business?.business_id ? "on" : ""}`}
                          onClick={() => switchCollege(b.business_id)}>
                    {b.display_name}
                    {b.business_id === sess.active_business?.business_id && <span className="tick">✓</span>}
                  </button>
                ))}
              </span>
            )}
          </span>
        ) : (
          <span className="biz-label">{sess?.active_business?.display_name || "…"}</span>
        )}
        <span className="nav-div" />
        <button className={`navtab ${screen === "chats" ? "on" : ""}`}
                onClick={() => setScreen("chats")}>Chats</button>
        <button className={`navtab ${screen === "results" ? "on" : ""}`}
                onClick={() => setScreen("results")}>Results</button>
        <span className="sp" />
        <span className="me">RV</span>
      </div>

      {screen === "results" ? (
        <ResultsScreen onStage={(s) => { setFilter(s); setScreen("chats"); }} />
      ) : (
      <div className={`main ${currentLead ? "with-brain" : ""}`}>
        <ConversationList
          leads={leads}
          counts={{ ...(board?.counts || {}), requisition_due: reqDueCount }}
          total={board?.total || 0}
          filter={filter}
          currentId={currentId}
          onFilter={setFilter}
          onSelect={openLead}
          sub={sub}
        />

        <div className="thread-wrap">
          {currentLead && currentLead.state === "noa" && !currentLead.requisition_sent && (
            <RequisitionBanner name={currentLead.name} onOpen={() => setReqOpen(true)} />
          )}
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
              onBack={() => { setCurrentId(null); setCurrentLead(null); setBrainOpen(false); }}
              onOpenBrain={() => setBrainOpen(true)}
            />
          )}
        </div>

        {currentLead && <BrainPanel brain={brain} leadId={currentId} open={brainOpen} onClose={() => setBrainOpen(false)} />}
      </div>
      )}

      {reqOpen && currentId && (
        <RequisitionModal
          leadId={currentId}
          onClose={() => setReqOpen(false)}
          onSent={() => {
            showToast("Requisition sent — family notified");
            loadBoard();
            if (currentId) openLead(currentId);
          }}
        />
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>

      <nav className="mtabbar">
        <button className={screen === "chats" ? "on" : ""} onClick={() => setScreen("chats")}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chats</button>
        <button className={screen === "results" ? "on" : ""} onClick={() => setScreen("results")}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/></svg>
          Results</button>
      </nav>
    </div>
  );
}
