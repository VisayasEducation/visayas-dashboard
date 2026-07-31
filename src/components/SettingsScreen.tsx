"use client";
// SETTINGS v3 — real data + first writable setting.
// College number unmasked from the DB, NOA mailbox shown, requisition To/Cc
// editable by owners (saved to business.config via PATCH), docs checklist is
// the real five (display-only: no remove, no add), KB opens the actual sheet.
import { useEffect, useState } from "react";
import { getSettings, saveRequisition, CollegeSettings,
         listTeam, changePassword, type TeamMember } from "@/lib/api";

const DOCS = ["10th marksheet", "12th marksheet", "NEET scorecard", "NEET admit card", "Passport/Aadhaar"];

export default function SettingsScreen({
  me, role, college, businessId: _, logoUrl, onExport,
}: { me: string; role: string; college: string; businessId: string;
     logoUrl?: string | null; onExport: () => void }) {
  const [s, setS] = useState<CollegeSettings | null>(null);
  const [to, setTo] = useState(""); const [cc, setCc] = useState("");
  const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pwTarget, setPwTarget] = useState<TeamMember | null>(null);
  const [newPw, setNewPw] = useState(""); const [pwMsg, setPwMsg] = useState("");
  useEffect(() => {
    getSettings().then((d) => { setS(d); setTo(d.requisition.to); setCc(d.requisition.cc); })
      .catch(() => setNote("Couldn't load settings"));
    if (role === "owner" || role === "tech")
      listTeam().then((r) => setTeam(r.members)).catch(() => {});
  }, [college, role]);
  const isOwner = role === "owner";
  const canManage = role === "owner" || role === "tech";
  const save = async () => {
    if (!isOwner || saving) return;
    setSaving(true); setNote("");
    try {
      const r = await saveRequisition(to.trim(), cc.trim());
      setTo(r.to); setCc(r.cc); setDirty(false); setNote("Saved \u2713");
    } catch { setNote("Save failed \u2014 check the addresses"); }
    setSaving(false);
  };
  const mark = (college || "C").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const Card = ({ t, ws, d, children }: { t: string; ws?: boolean; d?: string; children?: React.ReactNode }) => (
    <div className="scard">
      <div className="sh">{t}{ws && <span className="ws">WORKSPACE</span>}</div>
      {d && <div className="sd">{d}</div>}
      {children}
    </div>
  );
  const Row = ({ t, d, children }: { t: string; d?: string; children?: React.ReactNode }) => (
    <div className="srow">
      <div className="a"><b>{t}</b>{d && <em>{d}</em>}</div>
      <div className="b">{children}</div>
    </div>
  );
  const Soon = ({ label = "Coming soon" }: { label?: string }) => <span className="soon">{label}</span>;
  return (
    <div className="results-pane" style={{ paddingTop: 6 }}>
      <div className="setpage">
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Settings</h1>
        <div className="setsub">Everything here is per-college unless marked workspace. You&apos;re viewing <b>{college || "your college"}</b>.</div>

        <Card t="College" d="Identity Maya carries for this college.">
          <div className="srow" style={{ alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="setlogo">
                {logoUrl ? <img src={logoUrl} alt={college || "college"} /> : <b>{mark}</b>}
              </span>
              <div className="a"><b>{college || "This college"}</b><em>The crest families see</em></div>
            </div>
            <div className="b"><button className="btn2" disabled title="Coming soon">Change logo</button><Soon /></div>
          </div>
          <Row t="WhatsApp number" d="The number families message">
            <span className="val">{s?.phone_number || "\u2014"}</span><span className="live">Live</span>
          </Row>
        </Card>

        <Card t="Admissions" d="What Maya collects and where things go.">
          <Row t="Required documents" d="The checklist every family completes" />
          <div className="mprompt">{"\u2192"} Maya{"\u2019"}s prompt</div>
          <div className="docwrap">
            {DOCS.map((doc) => <span key={doc} className="chipx">{doc}</span>)}
          </div>
          <Row t="Booking amount" d="Set in Razorpay \u00B7 shown when the NOA is ready">
            <span className="val">{"\u20B9"}50,000</span>
            <button className="btn2" disabled title="Coming soon">Copy link</button>
          </Row>
          <Row t="NOA mailbox" d="Maya watches this inbox for the college's reply">
            <span className="val">visayaseducation2026@gmail.com</span><span className="live">Live</span>
          </Row>
          <Row t="Requisition · To" d="Where the document packet is addressed">
            <input className="setin" value={to} disabled={!isOwner}
                   onChange={(e) => { setTo(e.target.value); setDirty(true); }} />
          </Row>
          <Row t="Requisition · Cc" d="Copied on every packet">
            <input className="setin" value={cc} disabled={!isOwner}
                   onChange={(e) => { setCc(e.target.value); setDirty(true); }} />
          </Row>
          {isOwner && dirty && (
            <div className="saverow">
              {note && <span className="sd" style={{ alignSelf: "center" }}>{note}</span>}
              <button className="pillbtn" onClick={save} disabled={saving}>
                {saving ? "Saving\u2026" : "Save requisition emails"}
              </button>
            </div>
          )}
          {!dirty && note && <div className="sd" style={{ textAlign: "right", padding: "6px 0 10px" }}>{note}</div>}
        </Card>

        <Card t="Maya" d="How she behaves in this college's chats.">
          <Row t="Handoff WhatsApp" d="Pinged when a family asks for a person">
            <Soon label="With the handoff build" />
          </Row>
          <Row t="Handoff email" d="Copied on every handoff">
            <Soon label="With the handoff build" />
          </Row>
        </Card>

        <Card t="Team &amp; access" ws d="Names here are what families and logs see.">
          {team.filter((m) => m.role === "owner").map((m) => (
            <Row key={m.id} t={m.name} d="all three colleges">
              <span className="val" style={{ textTransform: "capitalize" }}>{m.role}</span>
              {canManage && <button className="btn2" onClick={() => { setPwTarget(m); setNewPw(""); setPwMsg(""); }}>Change password</button>}
            </Row>
          ))}
          {role === "tech" && team.filter((m) => m.role === "tech").map((m) => (
            <Row key={m.id} t={m.name} d="tech">
              <span className="val">Tech</span>
              <button className="btn2" onClick={() => { setPwTarget(m); setNewPw(""); setPwMsg(""); }}>Change password</button>
            </Row>
          ))}
          {team.some((m) => m.role === "counsellor") && (
            <div className="sd" style={{ fontWeight: 600, margin: "14px 0 2px" }}>Counsellors</div>
          )}
          {team.filter((m) => m.role === "counsellor").map((m) => (
            <Row key={m.id} t={m.name} d={m.college || ""}>
              <span className="val">{m.college || "—"}</span>
              {canManage && <button className="btn2" onClick={() => { setPwTarget(m); setNewPw(""); setPwMsg(""); }}>Change password</button>}
            </Row>
          ))}
          <Row t="Add counsellor" d="Name, WhatsApp, and role">
            <button className="btn2" disabled title="Coming soon">+ Add counsellor</button><Soon />
          </Row>
        </Card>

        {pwTarget && (
          <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setPwTarget(null); }}>
            <div className="opay">
              <div className="opay-h">
                <h3>Change password</h3>
                <button className="opay-x" onClick={() => setPwTarget(null)} aria-label="Close">✕</button>
              </div>
              <div className="opay-b">
                <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "0 0 14px" }}>
                  New password for <b>{pwTarget.name}</b> ({pwTarget.username})</p>
                <input className="opay-input" type="password" value={newPw}
                       placeholder="At least 8 characters" autoFocus
                       onChange={(e) => setNewPw(e.target.value)} />
                {pwMsg && <div className={pwMsg.startsWith("Done") ? "sd" : "opay-err"} style={{ marginTop: 10 }}>{pwMsg}</div>}
              </div>
              <div className="opay-f">
                <span />
                <button className="opay-go" disabled={newPw.length < 8}
                        onClick={async () => {
                          try { await changePassword(pwTarget.id, newPw); setPwMsg("Done — they can sign in with the new password"); }
                          catch (e: any) { setPwMsg(String(e?.message || "Failed")); }
                        }}>Save</button>
              </div>
            </div>
          </div>
        )}

        <Card t="Notifications" ws d="WhatsApp pings and the daily digest.">
          <Row t="WhatsApp alerts" d="Pings for new leads and stage updates">
            <span className="live">On</span>
          </Row>
          <Row t="Daily digest" d="Yesterday's numbers, every morning at 9:00 AM">
            <span className="val">Email + WhatsApp</span><span className="live">On</span>
          </Row>
          <Row t="Digest recipients" d="Who receives the morning summary"><Soon /></Row>
        </Card>

        <Card t="Knowledge" d="Fees, booking amounts, and media live as rows in one sheet.">
          <Row t="Knowledge base" d="Google Sheet Maya answers from">
            {s?.kb_sheet_url
              ? <a className="btn2" style={{ textDecoration: "none" }} href={s.kb_sheet_url}
                   target="_blank" rel="noreferrer">Open sheet {"\u2197"}</a>
              : <><button className="btn2" disabled title="Add KB_SHEET_URL env">Open sheet {"\u2197"}</button><Soon /></>}
          </Row>
        </Card>

        <Card t="Data" d="Your leads are yours.">
          <Row t="Export leads" d="CSV from the table view · password-protected, every export logged">
            <button className="pillbtn" onClick={onExport}>Open table {"\u2192"}</button>
          </Row>
        </Card>
      </div>
    </div>
  );
}
