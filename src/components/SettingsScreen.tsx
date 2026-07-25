"use client";
// SETTINGS v2 — prototype-match: white section cards with heading + description
// INSIDE the card, centered column, College section, doc chips with remove
// affordance and + Add, real-looking (disabled) buttons. Static by decision:
// real facts marked Live/On; everything configurable is Coming soon.
// Removed by decision (25 Jul): nudges, nudge timing, quiet hours, languages.
const DOCS = ["10th marksheet", "12th marksheet", "NEET scorecard", "Passport", "Photo"];

export default function SettingsScreen({
  me, role, college, onExport,
}: { me: string; role: string; college: string; onExport: () => void }) {
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
          <Row t={college || "This college"} d="Logo, name, and theme color">
            <button className="btn2" disabled title="Coming soon">Edit</button><Soon />
          </Row>
          <div className="srow" style={{ alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="avlogo">{mark}</span>
              <div className="a"><b>WhatsApp number</b><em>The number families message</em></div>
            </div>
            <div className="b"><span className="live">Live</span></div>
          </div>
        </Card>

        <Card t="Admissions" d="What Maya collects and where things go. Editing the checklist updates her instantly.">
          <Row t="Required documents" d="The checklist every family completes" />
          <div className="mprompt">{"\u2192"} Maya{"\u2019"}s prompt</div>
          <div className="docwrap">
            {DOCS.map((doc) => <span key={doc} className="chipx">{doc} <i>{"\u2715"}</i></span>)}
            <button className="btn2" disabled title="Coming soon">+ Add</button>
          </div>
          <Row t="Booking amount" d="Set in Razorpay · shown when the NOA is ready">
            <span className="val">{"\u20B9"}50,000</span>
            <button className="btn2" disabled title="Coming soon">Copy link</button>
          </Row>
          <Row t="NOA mailbox" d="Maya watches this inbox for the college's reply">
            <span className="live">Live</span>
          </Row>
          <Row t="Requisition emails" d="To and Cc for the document packet">
            <Soon />
          </Row>
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
          <Row t={me} d={`Replies as \u201C${me}\u201D`}>
            <span className="val" style={{ textTransform: "capitalize" }}>{role}</span>
          </Row>
          <Row t="Add counsellor" d="Name, WhatsApp, and role">
            <button className="btn2" disabled title="Coming soon">+ Add counsellor</button><Soon />
          </Row>
          <Row t="Change password"><Soon /></Row>
        </Card>

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
            <button className="btn2" disabled title="Coming soon">Open sheet {"\u2197"}</button><Soon />
          </Row>
        </Card>

        <Card t="Data" d="Your leads are yours.">
          <Row t="Export leads" d="Every lead as CSV, from the table view">
            <button className="pillbtn" onClick={onExport}>Open table {"\u2192"}</button>
          </Row>
        </Card>
      </div>
    </div>
  );
}
