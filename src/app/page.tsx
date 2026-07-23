"use client";
import { useCallback, useEffect, useState } from "react";
import { api, paymentsSummary, Board, Lead, TimelineEvent, Brain, Session } from "@/lib/api";
import ConversationList from "@/components/ConversationList";
import ThreadPanel from "@/components/ThreadPanel";
import BrainPanel from "@/components/BrainPanel";
import ResultsScreen from "@/components/ResultsScreen";
import RequisitionBanner from "@/components/RequisitionBanner";
import RequisitionModal from "@/components/RequisitionModal";

// ---- per-college theming (redesign v1). Matched on display name; UV Gullas is the default. ----
const THEMES = [
  { match: "gullas", accent: "#0c6e46", ink: "#0a5c3b", tint: "#eef6f1", tint2: "#e0efe7", border: "rgba(12,110,70,.18)", logo: "/logos/uv-gullas.png" },
  { match: "lyceum", accent: "#8a1f2d", ink: "#731a26", tint: "#f9ecee", tint2: "#f3dde0", border: "rgba(138,31,45,.18)", logo: "/logos/lyceum.png" },
  { match: "davao",  accent: "#2563a8", ink: "#1e528c", tint: "#e9f1fb", tint2: "#dbe8f7", border: "rgba(37,99,168,.18)", logo: "/logos/davao.png" },
];
const themeFor = (name?: string | null) => {
  const n = (name || "").toLowerCase();
  return THEMES.find((t) => n.includes(t.match)) || THEMES[0];
};
const mark = (name?: string | null) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const fmtINR = (paise: number) => {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2).replace(/\.?0+$/, "")}L`;
  if (r >= 1000) return `₹${Math.round(r / 1000)}k`;
  return `₹${Math.round(r)}`;
};

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
  const [meOpen, setMeOpen] = useState(false);
  const [money, setMoney] = useState<number | null>(null);
  const [me, setMe] = useState("Counsellor"); // replaced with the real login name after mount
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("maya_token")) {
      location.href = "/login";
      return;
    }
    const n = localStorage.getItem("maya_name");
    if (n) setMe(n);
    api.sessionMe().then(setSess).catch((e) => console.error("session/me failed", e));
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.(".biz-switch")) setBizOpen(false);
      if (!t.closest?.(".me-switch")) setMeOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  // redesign v1: tint the whole app to the active college + refresh the collected pill
  useEffect(() => {
    const t = themeFor(sess?.active_business?.display_name);
    const r = document.documentElement.style;
    r.setProperty("--accent", t.accent);
    r.setProperty("--accent-ink", t.ink);
    r.setProperty("--accent-tint", t.tint);
    r.setProperty("--accent-tint-2", t.tint2);
    r.setProperty("--accent-border", t.border);
    r.setProperty("--accent-soft", t.tint);
    r.setProperty("--accent-line", t.border);
    let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = t.logo;
    paymentsSummary(365)
      .then((s) => setMoney(s.collected_paise))
      .catch(() => setMoney(null));
  }, [sess]);

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
      if (document.hidden) return; // invisible tab: skip the fetch, let the DB sleep
      loadBoard();
      if (currentId) openLead(currentId); // refresh the open thread too
    }, 5000);
    return () => clearInterval(t);
  }, [loadBoard, currentId, openLead]);

  async function toggleAI() {
    if (!currentLead) return;
    const next = currentLead.driven_by === "human" ? "maya" : "human";
    try {
      await api.takeover(currentLead.id, next, me);
      showToast(next === "human" ? "You're driving — Maya is paused" : "Maya is back on");
      await loadBoard();
      await openLead(currentLead.id);
    } catch (e: any) {
      showToast(String(e.message || e).slice(0, 100));
    }
  }

  async function sendMsg(text: string) {
    if (!currentLead) return;
    try {
      await api.send(currentLead.id, text, me);
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

  return (
    <div className="app">
      <div className="top">
        {sess && sess.memberships.length > 1 ? (
          <span className="biz-switch">
            <button className="biz-pill" disabled={switching}
                    onClick={() => setBizOpen((v) => !v)}>
              <span className="biz-mark logo">
                <img src={themeFor(sess.active_business?.display_name).logo}
                     alt={sess.active_business?.display_name || "college"} />
              </span>
              {sess.active_business?.display_name || "Select college"}
              <span className="chev">{switching ? "…" : "▾"}</span>
            </button>
            {bizOpen && (
              <span className="biz-menu">
                {sess.memberships.map((b) => (
                  <button key={b.business_id}
                          className={`biz-item ${b.business_id === sess.active_business?.business_id ? "on" : ""}`}
                          onClick={() => switchCollege(b.business_id)}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span className="biz-mark logo">
                        <img src={themeFor(b.display_name).logo} alt={b.display_name} />
                      </span>
                      {b.display_name}
                    </span>
                    {b.business_id === sess.active_business?.business_id && <span className="tick">✓</span>}
                  </button>
                ))}
              </span>
            )}
          </span>
        ) : (
          <span className="biz-label">{sess?.active_business?.display_name || "…"}</span>
        )}
        <button className={`navtab ${screen === "chats" ? "on" : ""}`}
                onClick={() => setScreen("chats")}>Chats</button>
        <button className={`navtab ${screen === "results" ? "on" : ""}`}
                onClick={() => setScreen("results")}>Results</button>
        <span className="sp" />
        {money != null && money > 0 && (
          <button className="statpill" title="Collected across all time — tap for Results"
                  onClick={() => setScreen("results")}>
            <b>{fmtINR(money)}</b> collected
          </button>
        )}
        <span className="me-switch">
          <button className="me" onClick={() => setMeOpen((v) => !v)}>{mark(me)}</button>
          {meOpen && (
            <span className="me-menu">
              <span className="acct">
                <b>{me}</b>
                <em>{sess?.role || "member"}</em>
              </span>
              <button className="mi"
                      onClick={() => { setMeOpen(false); showToast("Settings — coming soon"); }}>
                Settings
              </button>
              <button className="mi"
                      onClick={() => {
                        localStorage.removeItem("maya_token");
                        localStorage.removeItem("maya_name");
                        location.href = "/login";
                      }}>
                Sign out
              </button>
            </span>
          )}
        </span>
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
              me={me}
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
