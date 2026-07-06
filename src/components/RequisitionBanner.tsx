"use client";

export default function RequisitionBanner({
  name, onOpen,
}: { name: string | null; onOpen: () => void }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7ebe7", borderLeft: "3px solid #0c6e46", borderRadius: 12, padding: "13px 15px", margin: "12px 14px 0", display: "flex", alignItems: "center", gap: 13, boxShadow: "0 6px 20px -8px rgba(12,110,70,.32)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e9f3ed", color: "#0c6e46", display: "grid", placeItems: "center", fontSize: 17, flex: "0 0 auto" }}>📎</div>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 14, fontWeight: 800, display: "block", color: "#16221c", letterSpacing: "-.01em" }}>Requisition ready to send</b>
        <span style={{ fontSize: 11.5, color: "#8a958e" }}>All documents are in for {name || "this student"}. Review and send it to the college.</span>
      </div>
      <button onClick={onOpen} style={{ background: "#0c6e46", color: "#fff", border: "none", borderRadius: 9, padding: "9px 15px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px -2px rgba(12,110,70,.45)" }}>Open requisition →</button>
    </div>
  );
}