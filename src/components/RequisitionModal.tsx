"use client";
import { useEffect, useState } from "react";
import { api, Requisition } from "@/lib/api";

const G = "#0c6e46", INK = "#16221c", INK2 = "#54625b", INK3 = "#8a958e", LINE = "#e7ebe7", SUNK = "#fafbfa";

export default function RequisitionModal({
  leadId, onClose, onSent,
}: { leadId: string; onClose: () => void; onSent: () => void }) {
  const [r, setR] = useState<Requisition | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [to, setTo] = useState(""); const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(""); const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.requisition(leadId).then((d) => {
      setR(d);
      setTo(d.draft.to); setCc(d.draft.cc);
      setSubject(d.draft.subject); setBody(d.draft.body);
    }).catch((e) => setErr(String(e.message || e)));
  }, [leadId]);

  async function send() {
    setSending(true);
    try {
      await api.sendRequisition(leadId, { to, cc, subject, body, by: "dashboard" });
      onSent(); onClose();
    } catch (e: any) { setErr(String(e.message || e)); setSending(false); }
  }

  const input: React.CSSProperties = { width: "100%", fontSize: 13.5, color: INK, background: SUNK, border: `1px solid ${LINE}`, borderRadius: 9, padding: "10px 12px", lineHeight: 1.5, fontFamily: "inherit" };
  const label: React.CSSProperties = { display: "block", font: "600 10px ui-monospace,monospace", letterSpacing: ".06em", textTransform: "uppercase", color: INK3, marginBottom: 5 };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
         style={{ position: "fixed", inset: 0, background: "rgba(25,25,23,.5)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 26 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "86vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 18px", borderBottom: `1px solid ${LINE}`, position: "sticky", top: 0, background: "#fff" }}>
          <b style={{ fontSize: 15 }}>Requisition <span style={{ color: INK3, fontWeight: 500 }}>· {r?.name || "lead"}</span></b>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 7, border: `1px solid ${LINE}`, background: "#fff", color: INK2, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "16px 18px 20px" }}>
          {err && <p style={{ color: "#a1443b", marginBottom: 10 }}>{err}</p>}
          {!r ? <p style={{ color: INK3 }}>Loading…</p> : (
            <>
              <div style={{ font: "600 10.5px ui-monospace,monospace", letterSpacing: ".08em", textTransform: "uppercase", color: INK3, marginBottom: 8 }}>Documents · {r.files.length} attached</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {r.files.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: INK2, background: SUNK, border: `1px solid ${LINE}`, borderRadius: 7, padding: "6px 10px", textDecoration: "none" }}>{f.filename}</a>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}><label style={label}>To</label><input style={input} value={to} onChange={(e) => setTo(e.target.value)} /></div>
              <div style={{ marginBottom: 12 }}><label style={label}>Cc</label><input style={input} value={cc} onChange={(e) => setCc(e.target.value)} /></div>
              <div style={{ marginBottom: 12 }}><label style={label}>Subject</label><input style={input} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              <div style={{ marginBottom: 16 }}><label style={label}>Message</label><textarea style={{ ...input, minHeight: 120, resize: "vertical" }} value={body} onChange={(e) => setBody(e.target.value)} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 12.5, color: INK3, lineHeight: 1.45 }}>Emails the college and messages the family. Your name goes on the log.</div>
                <button disabled={sending} onClick={send} style={{ marginLeft: "auto", background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 700, fontSize: 13.5, cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1, whiteSpace: "nowrap" }}>{sending ? "Sending…" : "Send requisition →"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}