"use client";
// ALL LEADS v1.2 — export moved to the server, behind the user's own password.
import { useState } from "react";
import { Lead } from "@/lib/api";
import { timeAgo } from "@/lib/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const STAGE: Record<string, string> = {
  new: "New", engaged: "Engaged", eligible: "Eligible", docs: "Docs",
  noa: "NOA", payment_due: "Payment", converted: "Done",
};
const SPCLS: Record<string, string> = {
  new: "sp-blue", engaged: "sp-green", eligible: "sp-green", docs: "sp-amber",
  noa: "sp-violet", payment_due: "sp-rose", converted: "sp-gray",
};
const inr = (p: number) => "\u20B9" + Math.round(p / 100).toLocaleString("en-IN");

function authHeader(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("maya_token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

async function doExport(password: string, slug: string) {
  const res = await fetch(`${API_BASE}/api/leads/export`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({ password }),
  });
  if (res.status === 403) throw new Error("Password is incorrect");
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${slug || "college"}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsTable({
  leads, college, onOpen,
}: { leads: Lead[]; college: string; onOpen: (id: string) => void }) {
  const rows = [...leads].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  const [expOpen, setExpOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [expErr, setExpErr] = useState("");
  const [expBusy, setExpBusy] = useState(false);

  const stageWord = (l: Lead) => STAGE[l.state || ""] || l.state || "New";
  const progress = (l: Lead) => {
    if (l.state === "docs") return `Docs ${l.docs_done ?? 0}/${l.docs_total ?? 5}`;
    if (l.state === "noa" && !l.requisition_sent) return "Requisition due";
    if (l.state === "noa") return "Awaiting NOA";
    if (l.state === "payment_due") return "Payment due";
    return stageWord(l);
  };
  const collected = (l: Lead) =>
    l.paid_paise && l.paid_paise > 0 ? inr(l.paid_paise) : "\u2014";

  const slug = college.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="results-pane" style={{ paddingTop: 6 }}>
      <div className="tblpage">
        <div className="tblhead">
          <div>
            <h1>All leads</h1>
            <p>Every lead as a row {"\u00B7"} click one to open its chat</p>
          </div>
          <button className="pillbtn" onClick={() => { setExpOpen(true); setPw(""); setExpErr(""); }}
                  disabled={rows.length === 0}>
            Export CSV
          </button>
        </div>
        <div className="tblcard">
          {rows.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>
              No leads yet. The first family to message appears here.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Student</th><th>Stage</th><th>Source</th>
                  <th>Progress</th><th>Collected</th><th>With</th><th>Last</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} onClick={() => onOpen(l.id)}>
                    <td className="nm">{l.name || l.phone || "Unknown"}</td>
                    <td><span className={`sp ${SPCLS[l.state || ""] || "sp-gray"}`}>{stageWord(l)}</span></td>
                    <td>{l.source || "\u2014"}</td>
                    <td>{progress(l)}</td>
                    <td style={{ fontWeight: 600, color: collected(l) === "\u2014" ? undefined : "var(--accent-ink)" }}>{collected(l)}</td>
                    <td>{l.driven_by === "human" ? "You" : "Maya"}</td>
                    <td>{timeAgo(l.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {expOpen && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setExpOpen(false); }}>
          <div className="opay">
            <div className="opay-h">
              <h3>Export is protected</h3>
              <button className="opay-x" onClick={() => setExpOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="opay-b">
              <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "0 0 14px" }}>
                Family data is sensitive. Enter your password to continue — every export is logged.</p>
              <input className="opay-input" type="password" value={pw}
                     placeholder="Your login password" autoFocus
                     onChange={(e) => setPw(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === "Enter" && pw.length >= 1 && !expBusy) {
                         setExpBusy(true); setExpErr("");
                         doExport(pw, slug).then(() => setExpOpen(false))
                           .catch((err) => setExpErr(err.message))
                           .finally(() => setExpBusy(false));
                       }
                     }} />
              {expErr && <div className="opay-err" style={{ marginTop: 10 }}>{expErr}</div>}
            </div>
            <div className="opay-f">
              <span />
              <button className="opay-go" disabled={pw.length < 1 || expBusy}
                      onClick={async () => {
                        setExpBusy(true); setExpErr("");
                        try { await doExport(pw, slug); setExpOpen(false); }
                        catch (e: any) { setExpErr(e.message); }
                        setExpBusy(false);
                      }}>{expBusy ? "Exporting\u2026" : "Export"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
