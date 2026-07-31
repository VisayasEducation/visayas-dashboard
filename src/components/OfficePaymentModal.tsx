"use client";
import { useState } from "react";
import { api } from "@/lib/api";

const METHODS = [
  { id: "office_cash", label: "Cash" },
  { id: "office_upi",  label: "UPI at office" },
  { id: "office_card", label: "Card" },
];

export default function OfficePaymentModal({
  leadId, duePaise, me, onClose, onDone,
}: {
  leadId: string; duePaise: number | null; me: string;
  onClose: () => void; onDone: (msg: string) => void;
}) {
  const dueRupees = duePaise ? Math.round(duePaise / 100) : 0;
  const [amount, setAmount] = useState(dueRupees ? String(dueRupees) : "");
  const [method, setMethod] = useState("office_cash");
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const rupees = parseInt(amount || "0", 10);
  const ok = rupees > 0 && rupees <= 200000 && me.trim().length >= 2;
  const left = dueRupees - rupees;

  // The line under the amount reflects what this payment actually is.
  const sub = !dueRupees ? "The booking amount"
    : left <= 0 ? "The full booking amount, set in Razorpay"
    : `Part payment · ₹${left.toLocaleString("en-IN")} will remain`;

  async function save() {
    if (!ok || busy) return;
    setBusy(true); setErr("");
    try {
      const key = `${leadId}-${rupees}-${Date.now().toString().slice(0, 10)}`;
      await api.recordOfficePayment(leadId, {
        amount_rupees: rupees, staff_name: me, method,
        receipt_no: receipt.trim(), note: "", idempotency_key: key,
      });
      onDone("Recorded");
    } catch (e: any) {
      setErr(String(e?.message || e).slice(0, 160));
      setBusy(false);
    }
  }

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="opay">
        <div className="opay-h">
          <h3>Record office payment</h3>
          <button className="opay-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="opay-b">
          <div className="opay-amt">
            <span>₹</span>
            <input inputMode="numeric" value={amount} aria-label="Amount received"
                   onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          </div>
          <p className="opay-sub">{sub}</p>

          <p className="opay-lab">Method</p>
          <div className="opay-methods">
            {METHODS.map((m) => (
              <button key={m.id}
                      className={`opay-chip${method === m.id ? " on" : ""}`}
                      onClick={() => setMethod(m.id)}>{m.label}</button>
            ))}
          </div>

          <p className="opay-lab">Receipt no <span>· optional</span></p>
          <input className="opay-input" value={receipt} maxLength={40}
                 placeholder="Office receipt book no."
                 onChange={(e) => setReceipt(e.target.value)} />

          {err && <div className="opay-err">{err}</div>}
        </div>

        <div className="opay-f">
          <p className="opay-by">Recorded by {me || "—"} · goes on the audit log</p>
          <button className="opay-go" onClick={save} disabled={!ok || busy}>
            {busy ? "Recording…" : "Record"}</button>
        </div>
      </div>
    </div>
  );
}
