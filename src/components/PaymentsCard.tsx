// src/components/PaymentsCard.tsx — money truth for one lead.
// Sources shown as "Online · automatic" and "Office · <name>". No jargon.
"use client";
import { useEffect, useState } from "react";
import { getPayments, recordOfficePayment, resendPaymentLink, sendOriginalAgain,
         assignCounsellor, setExpectedVisit, type PaymentLedger } from "@/lib/api";

const fmt = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

export default function PaymentsCard({ leadId, state }:
  { leadId: string; state: string }) {
  const [led, setLed] = useState<PaymentLedger | null>(null);
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(0);
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState("");
  const [cName, setCName] = useState("");
  const [visit, setVisit] = useState("");
  const [msg, setMsg] = useState("");
  const converted = state === "converted";

  const load = () => getPayments(leadId).then(l => {
    setLed(l); setAmt(Math.round(l.balance_paise / 100));
  }).catch(() => setLed(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [leadId]);

  if (!led) return null;
  const pct = Math.min(100, (led.paid_paise / led.goal_paise) * 100);

  const record = async () => {
    if (!amt || !by.trim()) { setMsg("Amount and your name are both needed."); return; }
    setBusy(true);
    try {
      const r = await recordOfficePayment(leadId, amt, by.trim(), "", idem);
      setOpen(false);
      setMsg(r.converted ? "Payment complete — original letter sent."
                         : `${fmt(amt * 100)} recorded.`);
      if (r.converted) location.reload(); else load();
    } catch { setMsg("Could not record the payment — try again."); }
    setBusy(false);
  };

  return (
    <div className="bi-card">
      <div className="bi-sub" style={{ alignItems: "center" }}>
        <span>Payments</span>
        <span className="bi-hint">
          {led.razorpay_link_url
            ? (converted || led.balance_paise === 0 ? "Payment link · paid in full"
                                                    : "Payment link · active")
            : "No payment link yet"}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
        <span style={{ color: "#57534e" }}>Paid so far</span>
        <b>{fmt(led.paid_paise)}</b>
      </div>
      <div style={{ height: 8, borderRadius: 5, background: "#f0efec",
                    overflow: "hidden", margin: "6px 0" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`,
                       background: "linear-gradient(90deg,#0b6b46,#149863)",
                       transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
        <span style={{ color: "#57534e" }}>Balance due</span>
        <b>{fmt(led.balance_paise)}</b>
      </div>

      {led.items.length > 0 && (
        <div style={{ marginTop: 8, borderTop: "1px solid #f0efec" }}>
          {led.items.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                                  padding: "7px 0", borderBottom: "1px solid #f0efec",
                                  fontSize: 12.5 }}>
              <b style={{ minWidth: 70 }}>{fmt(p.amount_paise)}</b>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px",
                             borderRadius: 6,
                             background: p.method === "office_cash" ? "#efedf9" : "#e7f3ed",
                             color: p.method === "office_cash" ? "#5b53b8" : "#075033" }}>
                {p.method === "office_cash" ? `Office · ${p.by || "staff"}` : "Online · automatic"}
              </span>
              <span style={{ marginLeft: "auto", color: "#a8a29e", fontSize: 11 }}>
                {new Date(p.at).toLocaleString("en-IN", { day: "numeric", month: "short",
                  hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {!converted && led.balance_paise > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => { setOpen(true); setMsg("");
                                   setIdem(crypto.randomUUID()); }}
            style={{ flex: 1, background: "#1c1917", color: "#fff", border: "none",
                     borderRadius: 8, padding: "9px 10px", fontWeight: 700,
                     fontSize: 12.5, cursor: "pointer" }}>
            Mark paid — office
          </button>
          {led.razorpay_link_url && (
            <button onClick={async () => {
                try { await resendPaymentLink(leadId); setMsg("Link sent to the family again."); }
                catch { setMsg("Could not send the link — try again."); } }}
              style={{ flex: 1, background: "#fff", color: "#57534e",
                       border: "1px solid #e7e5e4", borderRadius: 8,
                       padding: "9px 10px", fontWeight: 700, fontSize: 12.5,
                       cursor: "pointer" }}>
              Send the link again
            </button>
          )}
        </div>
      )}

      {converted && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8,
                        background: "#e7f3ed", border: "1px solid #c9e4d6",
                        borderRadius: 9, padding: "9px 11px", fontWeight: 700,
                        color: "#075033", fontSize: 12.5 }}>
            ✓ Seat confirmed — original letter sent to the family
          </div>
          {led.counsellor ? (
            <div style={{ marginTop: 8, fontSize: 12.5, color: "#57534e" }}>
              Counsellor: <b style={{ color: "#1c1917" }}>{led.counsellor}</b>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input placeholder="Counsellor's name" value={cName}
                onChange={e => setCName(e.target.value)}
                style={{ flex: 1, border: "1px solid #e7e5e4", borderRadius: 8,
                         padding: "8px 10px", fontSize: 12.5 }} />
              <button onClick={async () => {
                  if (!cName.trim()) return;
                  try { await assignCounsellor(leadId, cName.trim(), "dashboard");
                        setMsg("Counsellor assigned — lead leaves the queue.");
                        load(); }
                  catch { setMsg("Could not assign — try again."); } }}
                style={{ background: "#0b6b46", color: "#fff", border: "none",
                         borderRadius: 8, padding: "8px 12px", fontWeight: 700,
                         fontSize: 12.5, cursor: "pointer" }}>Assign</button>
            </div>
          )}
          <button onClick={async () => {
              try { await sendOriginalAgain(leadId); setMsg("Original letter sent again."); }
              catch { setMsg("Could not send — try again."); } }}
            style={{ marginTop: 8, width: "100%", background: "#fff",
                     color: "#57534e", border: "1px solid #e7e5e4", borderRadius: 8,
                     padding: "8px 10px", fontWeight: 700, fontSize: 12.5,
                     cursor: "pointer" }}>
            Send the original again
          </button>
        </div>
      )}

      {!converted && (
        led.expected_visit ? (
          <div style={{ marginTop: 10, background: "#efedf9",
                        border: "1px solid #ddd8f2", color: "#5b53b8",
                        borderRadius: 9, padding: "8px 11px", fontSize: 12,
                        fontWeight: 600 }}>
            Family expects to visit: <b>{led.expected_visit}</b>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <input placeholder="Expected visit (e.g. Sat 12 Jul, morning)"
              value={visit} onChange={e => setVisit(e.target.value)}
              style={{ flex: 1, border: "1px solid #e7e5e4", borderRadius: 8,
                       padding: "8px 10px", fontSize: 12 }} />
            <button onClick={async () => {
                if (!visit.trim()) return;
                try { await setExpectedVisit(leadId, visit.trim());
                      setMsg("Visit noted."); load(); }
                catch { setMsg("Could not save — try again."); } }}
              style={{ background: "#fff", color: "#57534e",
                       border: "1px solid #e7e5e4", borderRadius: 8,
                       padding: "8px 12px", fontWeight: 700, fontSize: 12,
                       cursor: "pointer" }}>Save</button>
          </div>
        )
      )}

      {msg && <div style={{ marginTop: 8, fontSize: 12, color: "#57534e" }}>{msg}</div>}

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,.45)",
                      display: "grid", placeItems: "center", zIndex: 60 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(400px,92vw)",
                        padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Record an office payment</h3>
            <p style={{ fontSize: 12, color: "#57534e", margin: "4px 0 12px" }}>
              Cash is recorded on your word — it goes into the lead's record with
              your name.</p>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#57534e" }}>
              Amount received (₹)</label>
            <input type="number" value={amt || ""} min={1}
              onChange={e => setAmt(parseInt(e.target.value || "0"))}
              style={{ width: "100%", border: "1px solid #e7e5e4", borderRadius: 8,
                       padding: "9px 11px", fontSize: 14, margin: "5px 0 11px" }} />
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#57534e" }}>
              Received by (your name)</label>
            <input value={by} onChange={e => setBy(e.target.value)}
              placeholder="e.g. Divya"
              style={{ width: "100%", border: "1px solid #e7e5e4", borderRadius: 8,
                       padding: "9px 11px", fontSize: 14, margin: "5px 0 12px" }} />
            <div style={{ background: "#f0efec", borderRadius: 8, padding: "8px 11px",
                          fontSize: 11.5, color: "#57534e", marginBottom: 12 }}>
              Will be recorded as: {fmt((amt || 0) * 100)} · office ·
              {" "}{by.trim() || "—"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setOpen(false)}
                style={{ flex: 1, background: "#fff", border: "1px solid #e7e5e4",
                         borderRadius: 8, padding: "10px", fontWeight: 700,
                         cursor: "pointer" }}>Cancel</button>
              <button onClick={record} disabled={busy}
                style={{ flex: 1, background: "#0b6b46", color: "#fff", border: "none",
                         borderRadius: 8, padding: "10px", fontWeight: 700,
                         cursor: "pointer", opacity: busy ? .6 : 1 }}>
                {busy ? "Recording…" : `Record ${fmt((amt || 0) * 100)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}