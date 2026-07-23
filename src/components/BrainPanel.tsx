"use client";
import { api, Brain } from "@/lib/api";

const STAGE_RAIL: [string, string][] = [
  ["new", "New"], ["engaged", "Engaged"], ["eligible", "Eligible"],
  ["docs", "Docs"], ["noa", "NOA"], ["payment_due", "Payment"], ["converted", "Done"],
];
const STAGE_DESC: Record<string, string> = {
  new: "Just reached out. Maya is greeting and learning what they need.",
  engaged: "In conversation. Maya is building the eligibility picture.",
  eligible: "They can proceed. Maya is moving toward documents.",
  docs: "Collecting the documents for the Note of Acceptance.",
  noa: "All documents in. Send the requisition, then wait for the NOA.",
  payment_due: "NOA ready. The booking payment secures the seat.",
  converted: "Paid in full — done here. A counsellor now handles visa, travel and enrolment.",
  closed: "This conversation is closed.",
};

function StageRail({ state }: { state: string }) {
  const idx = STAGE_RAIL.findIndex(([k]) => k === state);
  return (
    <div className="bi-rail">
      {STAGE_RAIL.map(([k, label], i) => {
        const cls = i < idx ? "done" : i === idx ? "cur" : "";
        return (
          <div key={k} className={`rn ${cls}`}>
            <span className="bead">{i < idx ? "✓" : ""}</span>
            <span className="cap">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: React.ReactNode; muted?: boolean }) {
  return (
    <div className="bi-row">
      <span className="bi-k">{k}</span>
      <span className={`bi-v ${muted ? "muted" : ""}`}>{v}</span>
    </div>
  );
}

import PaymentsCard from "./PaymentsCard";
import { verifyFlaggedDoc, openLeadFile } from "@/lib/api";

export default function BrainPanel({
  brain, leadId, open = false, onClose,
}: { brain: Brain | null; leadId?: string | null; open?: boolean; onClose?: () => void }) {
  if (!brain) return <div className="bi-empty">Select a conversation</div>;

  const { identity: id, state } = brain;
  const firstName = (id.student_name || id.name || "This lead").trim().split(/\s+/)[0];
  const stageLabel = STAGE_RAIL.find(([k]) => k === state)?.[1] || state;
  const isDocs = state === "docs" || state === "noa";
  const isPayment = state === "payment_due";
  const isConverted = state === "converted";
  const showLearning = state === "new" || state === "engaged" || state === "eligible";

  const isParent = !!id.asking_for && id.asking_for !== "self";
  const decides = id.asking_for === "self" ? "Student"
    : id.asking_for ? `Parent · for ${id.asking_for}` : null;

  return (
    <div className={`bi ${open ? "open" : ""}`}>
      <div className="bi-head">
        <span className="bi-title">{firstName}&apos;s journey</span>
        <span className={`bi-stagepill ${state}`}>{stageLabel}</span>
        {onClose && <button className="bi-close" onClick={onClose} aria-label="Close">✕</button>}
      </div>

      {/* stage rail */}
      <div className="bi-card">
        <StageRail state={state} />
        <div className="bi-stagedesc">
          {state === "docs" ? (
            <>Collecting the <b>{brain.docs.total} documents</b> for the Note of Acceptance.</>
          ) : (
            STAGE_DESC[state] || ""
          )}
        </div>
        <div className="bi-meter">
          <span style={{ width: `${Math.round(((STAGE_RAIL.findIndex(([k]) => k === state) + 1) / STAGE_RAIL.length) * 100)}%` }} />
        </div>
      </div>

      {/* identity */}
      <div className="bi-card">
        <Row
          k="Name"
          v={<>{id.student_name || id.name || <span className="skel" />}{isParent && <span className="who-badge">parent</span>}</>}
          muted={!id.name && !id.student_name}
        />
        <Row k="Source" v={id.campaign ? `${id.source} · ${id.campaign}` : id.source || "whatsapp"} />
        <Row
          k="Language"
          v={id.reply_language ? (
            <>
              <b>{id.reply_language}</b>{" "}<span className="det">● detected</span>
              {id.languages_used.length > 1 && <span className="langs"> ({id.languages_used.join(", ")})</span>}
            </>
          ) : "listening…"}
          muted={!id.reply_language}
        />
        {(id.neet_score != null || id.pcb != null) && (
          <Row k="NEET / PCB" v={`${id.neet_score ?? "—"} · ${id.pcb != null ? id.pcb + "%" : "—"}`} />
        )}
        {brain.journey_days != null && brain.journey_days > 0 && (
          <Row k="Journey age" v={`${brain.journey_days} days`} />
        )}
        {decides && <Row k="Decides" v={decides} />}
        <Row
          k="Signals"
          v={id.concerns && id.concerns.length ? (
            <span className="sigs">
              {id.concerns.map((c) => (
                <span key={c} className={`sig ${c === id.concern ? "primary" : ""}`}>{c}</span>
              ))}
            </span>
          ) : "listening…"}
          muted={!(id.concerns && id.concerns.length)}
        />
      </div>

      {/* what Maya learned (with values) */}
      {showLearning && (
        <div className="bi-card">
          <div className="bi-sub">
            <span>Maya is learning</span>
            <span className="bi-hint">conversationally, never a form</span>
          </div>
          {brain.learning.items.map((it) => {
            const asking = brain.learning.next === it.key;
            return (
              <div key={it.key} className={`bi-check ${it.done ? "done" : ""} ${asking ? "asking" : ""}`}>
                <span className="dot">{it.done ? "✓" : ""}</span>
                <span className="lbl">
                  {it.label}
                  {it.value && <span className="val">{it.value}</span>}
                  {asking && !it.value && <span className="val muted">Asking now…</span>}
                </span>
                {asking && <span className="chip">ASKING NOW</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* documents */}
      {(isDocs || isPayment || isConverted) && (
        <div className="bi-card">
          <div className="bi-sub" style={{ alignItems: "center" }}>
            <span>Documents</span>
            <span className="dl-wrap">
              {leadId && brain.docs.done > 0 && (
                <button className="dl-btn"
                        onClick={() => api.downloadDocs(leadId, id.name || "lead")}>⬇ Download</button>
              )}
              <span className="bi-hint">{brain.docs.done} of {brain.docs.total}</span>
            </span>
          </div>
          {brain.docs.items.map((d: any) => (
            <div key={d.key} className={`bi-check ${d.done ? "done" : ""}`}>
              <span className="dot" style={d.flag ? { background: "#b45309" } : undefined}>
                {d.flag ? "!" : d.done ? "✓" : ""}</span>
              <span className="lbl">
                {d.label}
                {d.flag && <span style={{ display: "block", fontSize: 11,
                  color: "#b45309", fontWeight: 600 }}>
                  Needs a look — {d.flag.reason || "flagged"}</span>}
              </span>
              {d.done && !d.flag && leadId && (
                <button
                  onClick={() => openLeadFile(leadId, d.key)}
                  style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700,
                           padding: "3px 8px", borderRadius: 6,
                           border: "1px solid #d3e6dc", background: "#eef6f1",
                           color: "#0b6b46", cursor: "pointer" }}>
                  View
                </button>
              )}
              {d.flag && leadId && (
                <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={async () => {
                      const who = prompt("Verifying as (your name):", localStorage.getItem("maya_name") || "") || "";
                      if (!who.trim()) return;
                      await verifyFlaggedDoc(leadId, d.key, true, who.trim());
                      location.reload(); }}
                    style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px",
                             borderRadius: 7, border: "none", background: "#0b6b46",
                             color: "#fff", cursor: "pointer" }}>Verify</button>
                  <button onClick={async () => {
                      const who = prompt("Rejecting as (your name):", localStorage.getItem("maya_name") || "") || "";
                      if (!who.trim()) return;
                      await verifyFlaggedDoc(leadId, d.key, false, who.trim());
                      location.reload(); }}
                    style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px",
                             borderRadius: 7, border: "1px solid #e7e5e4",
                             background: "#fff", color: "#b3372f",
                             cursor: "pointer" }}>Reject</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {state === "noa" && leadId && (
        <div className="bi-card noa">
          <div className="bi-sub"><span>Note of Acceptance</span></div>
          <p className="noa-hint">Send the requisition from the banner on the conversation. When the college replies, mark the NOA:</p>
          <div className="noa-actions">
            <button className="noa-recv"
              onClick={async () => { await api.noaAction(leadId, "received"); location.reload(); }}>
              NOA received</button>
            <button className="noa-more"
              onClick={async () => { await api.noaAction(leadId, "more_docs"); location.reload(); }}>
              More docs needed</button>
          </div>
        </div>
      )}
      
      {/* NOA vault (v9) */}
      {(state === "noa" || isPayment || isConverted) && leadId && (
        <div className="bi-card">
          <div className="bi-sub">
            <span>NOA vault</span>
            <span className="bi-hint">private · R2</span>
          </div>
          <div className="bi-check done">
            <span className="dot">✓</span>
            <span className="lbl">
              Stamped copy
              <span className="val">{isPayment || isConverted ? "Sent to family" : "Ready"}</span>
            </span>
            <button
              onClick={() => openLeadFile(leadId, "noa_copy")}
              style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700,
                       padding: "3px 8px", borderRadius: 6,
                       border: "1px solid #d3e6dc", background: "#eef6f1",
                       color: "#0b6b46", cursor: "pointer" }}>View</button>
          </div>
          <div className={`bi-check ${isConverted ? "done" : ""}`}>
            <span className="dot">{isConverted ? "✓" : ""}</span>
            <span className="lbl">
              Original (colour)
              <span className="val">
                {isConverted ? "Released to family" : "Held · releases on payment"}
              </span>
            </span>
            {isConverted ? (
              <button
                onClick={() => openLeadFile(leadId, "noa_original")}
                style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700,
                         padding: "3px 8px", borderRadius: 6,
                         border: "1px solid #d3e6dc", background: "#eef6f1",
                         color: "#0b6b46", cursor: "pointer" }}>View</button>
            ) : (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#8f8f88" }}>🔒 held</span>
            )}
          </div>
        </div>
      )}

      {/* payment / converted */}
      {(isPayment || isConverted) && leadId && (
        <PaymentsCard leadId={leadId} state={state} />
      )}

    </div>
  );
}