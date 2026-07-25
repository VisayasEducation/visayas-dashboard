"use client";
// ALL LEADS v1.1 — prototype-match: centered card panel, colored stage pills,
// progress falls back to the stage word, COLLECTED column (shows amounts when
// the board carries paid_paise; "—" until then). CSV export stays a plain
// download — password gate is a pending decision; the app is login-gated.
import { Lead } from "@/lib/api";
import { timeAgo } from "@/lib/ui";

const STAGE: Record<string, string> = {
  new: "New", engaged: "Engaged", eligible: "Eligible", docs: "Docs",
  noa: "NOA", payment_due: "Payment", converted: "Done",
};
const SPCLS: Record<string, string> = {
  new: "sp-blue", engaged: "sp-green", eligible: "sp-green", docs: "sp-amber",
  noa: "sp-violet", payment_due: "sp-rose", converted: "sp-gray",
};
const inr = (p: number) => "\u20B9" + Math.round(p / 100).toLocaleString("en-IN");

export default function LeadsTable({
  leads, college, onOpen,
}: { leads: Lead[]; college: string; onOpen: (id: string) => void }) {
  const rows = [...leads].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));

  const stageWord = (l: Lead) => STAGE[l.state || ""] || l.state || "New";
  const progress = (l: Lead) => {
    if (l.state === "docs") return `Docs ${l.docs_done ?? 0}/${l.docs_total ?? 5}`;
    if (l.state === "noa" && !l.requisition_sent) return "Requisition due";
    if (l.state === "noa") return "Awaiting NOA";
    if (l.state === "payment_due") return "Payment due";
    return stageWord(l); // prototype: no finer progress -> the stage word, never a dash
  };
  const collected = (l: Lead) =>
    l.paid_paise && l.paid_paise > 0 ? inr(l.paid_paise) : "\u2014";

  const exportCSV = () => {
    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const head = ["Student", "Phone", "Stage", "Source", "Progress", "Collected", "With", "Last activity"];
    const body = rows.map((l) => [
      l.name || "", l.phone || "", stageWord(l), l.source || "",
      progress(l), collected(l) === "\u2014" ? "" : collected(l),
      l.driven_by === "human" ? "You" : "Maya", l.updated_at || "",
    ].map(esc).join(","));
    const csv = [head.map(esc).join(","), ...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    const slug = college.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.href = url;
    a.download = `leads-${slug || "college"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="results-pane" style={{ paddingTop: 6 }}>
      <div className="tblpage">
        <div className="tblhead">
          <div>
            <h1>All leads</h1>
            <p>Every lead as a row {"\u00B7"} click one to open its chat</p>
          </div>
          <button className="pillbtn" onClick={exportCSV} disabled={rows.length === 0}>
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
    </div>
  );
}
