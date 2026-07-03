"use client";
import { Brain } from "@/lib/api";

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="bi-prog">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i < done ? "on" : ""} />
      ))}
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

export default function BrainPanel({ brain }: { brain: Brain | null }) {
  if (!brain) return <div className="bi-empty">Select a conversation</div>;

  const { identity: id, state } = brain;
  const isNew = state === "new" || state === "engaged" || state === "eligible";
  const isDocs = state === "docs_loa";
  const isPayment = state === "payment_due";
  const isConverted = state === "converted";

  return (
    <div className="bi">
      <div className="bi-head">
        <span className="bi-title">Lead intelligence</span>
        <span className="bi-state">state · {state}</span>
      </div>

      {/* ---- identity card (always shown) ---- */}
      <div className="bi-card">
        <Progress
          done={brain.learning.items.filter((i) => i.done).length}
          total={brain.learning.items.length}
        />
        <Row k="Name" v={id.student_name || id.name || <span className="skel" />} muted={!id.name && !id.student_name} />
        <Row k="Source" v={id.campaign ? `${id.source} · ${id.campaign}` : id.source || "whatsapp"} />
        <Row
          k="Language"
          v={
            id.reply_language ? (
              <>
                <b>{id.reply_language}</b>{" "}
                <span className="det">● detected</span>
                {id.languages_used.length > 1 && (
                  <span className="langs"> ({id.languages_used.join(", ")})</span>
                )}
              </>
            ) : (
              "listening…"
            )
          }
          muted={!id.reply_language}
        />
        {(id.neet_score != null || isDocs || isPayment) && (
          <Row
            k="NEET / PCB"
            v={
              id.neet_score != null || id.pcb != null
                ? `${id.neet_score ?? "—"} · ${id.pcb != null ? id.pcb + "%" : "—"}`
                : "not shared yet"
            }
            muted={id.neet_score == null && id.pcb == null}
          />
        )}
        {brain.journey_days != null && brain.journey_days > 0 && (
          <Row k="Journey age" v={`${brain.journey_days} days`} />
        )}
        {id.asking_for && (
          <Row k="Decides" v={id.asking_for === "self" ? "Student" : id.asking_for} />
        )}
        <Row
          k="Signals"
          v={id.concern ? <span className="sig">{id.concern}</span> : "listening…"}
          muted={!id.concern}
        />
      </div>

      {/* ---- NEW: the learning checklist ---- */}
      {isNew && (
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
                <span className="lbl">{it.label}</span>
                {asking && <span className="chip">ASKING NOW</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- DOCS/PAYMENT/CONVERTED: the document checklist ---- */}
      {(isDocs || isPayment || isConverted) && (
        <div className="bi-card">
          <div className="bi-sub">
            <span>Documents</span>
            <span className="bi-hint">
              {brain.docs.done} of {brain.docs.total}
            </span>
          </div>
          {brain.docs.done === 0 ? (
            <div className="bi-note">Not collected yet — inbound file storage is the next step.</div>
          ) : (
            brain.docs.items.map((d) => (
              <div key={d.key} className={`bi-check ${d.done ? "done" : ""}`}>
                <span className="dot">{d.done ? "✓" : ""}</span>
                <span className="lbl">{d.label}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---- PAYMENT / CONVERTED: the payment card ---- */}
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

      {/* ---- CONVERTED: handover ---- */}
      {isConverted && (
        <div className="bi-card">
          <div className="bi-sub">
            <span>Handover brief</span>
            <span className="bi-hint">the relay</span>
          </div>
          <div className="bi-note">Generated at handover — the handoff step builds this.</div>
        </div>
      )}

      {/* ---- Playbook (NEW) ---- */}
      {isNew && (
        <div className="bi-card muted-card">
          <div className="bi-sub"><span>Playbook · first 10 minutes</span></div>
          <div className="bi-play">
            <b>One question at a time. No firehose.</b> Maya feeds the right artifact when the concern shows itself.
          </div>
        </div>
      )}

      {/* ---- Gate (always) ---- */}
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
