"use client";
import { Brain } from "@/lib/api";

const STAGE_RAIL: [string, string][] = [
  ["new", "New"], ["engaged", "Engaged"], ["eligible", "Eligible"],
  ["docs", "Docs"], ["noa_requested", "NOA"], ["payment_due", "Payment"], ["converted", "Done"],
];
const STAGE_DESC: Record<string, string> = {
  new: "Just reached out. Maya is greeting and learning what they need.",
  engaged: "In conversation. Maya is helping and gathering the eligibility picture.",
  eligible: "They can proceed. Maya is moving toward document collection.",
  docs: "Collecting the documents for the Note of Acceptance.",
  noa_requested: "Documents in — the request has gone to the college. Awaiting the NOA.",
  payment_due: "NOA ready. The booking payment secures the seat.",
  converted: "Paid and joined. A counsellor now handles visa, travel and enrolment.",
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

export default function BrainPanel({
  brain, open = false, onClose,
}: { brain: Brain | null; open?: boolean; onClose?: () => void }) {
  if (!brain) return <div className="bi-empty">Select a conversation</div>;

  const { identity: id, state } = brain;
  const isDocs = state === "docs" || state === "noa_requested";
  const isPayment = state === "payment_due";
  const isConverted = state === "converted";
  const showLearning = state === "new" || state === "engaged" || state === "eligible";

  const isParent = !!id.asking_for && id.asking_for !== "self";
  const decides = id.asking_for === "self" ? "Student"
    : id.asking_for ? `Parent · for ${id.asking_for}` : null;

  return (
    <div className={`bi ${open ? "open" : ""}`}>
      <div className="bi-head">
        <span className="bi-title">Lead intelligence</span>
        <span className="bi-state">state · {state}</span>
        {onClose && <button className="bi-close" onClick={onClose} aria-label="Close">✕</button>}
      </div>

      {/* stage rail */}
      <div className="bi-card">
        <div className="bi-sub"><span>Stage</span></div>
        <StageRail state={state} />
        <div className="bi-stagedesc">{STAGE_DESC[state] || ""}</div>
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
          <div className="bi-sub">
            <span>Documents</span>
            <span className="bi-hint">{brain.docs.done} of {brain.docs.total}</span>
          </div>
          {brain.docs.items.map((d) => (
            <div key={d.key} className={`bi-check ${d.done ? "done" : ""}`}>
              <span className="dot">{d.done ? "✓" : ""}</span>
              <span className="lbl">{d.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* payment / converted */}
      {(isPayment || isConverted) && (
        <div className="bi-card amber">
          <div className="bi-sub">
            <span>{isConverted ? "Initial payment" : "Payment due"}</span>
            <span className="bi-hint">Gullas config</span>
          </div>
          {brain.payment.due == null ? (
            <div className="bi-note">No payment recorded yet — the payment step wires this.</div>
          ) : (
            <>
              <div className="bi-money">
                ₹{(brain.payment.paid || 0).toLocaleString()}{" "}
                <span className="of">of ₹{brain.payment.due.toLocaleString()}</span>
              </div>
              <div className="bi-bar">
                <span style={{ width: `${Math.min(100, (brain.payment.paid / brain.payment.due) * 100)}%` }} />
              </div>
            </>
          )}
        </div>
      )}

      {/* gate */}
      <div className="bi-card">
        <div className="bi-sub">
          <span>Gate</span>
          <span className="bi-hint">armed from message one</span>
        </div>
        <div className="bi-gate">
          <span className="gc">{brain.gate_count}</span>
          <span>guarantee attempts on this lead</span>
        </div>
      </div>
    </div>
  );
}