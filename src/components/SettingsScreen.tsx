"use client";
// SETTINGS v1 — the mock's structure, static. Real facts shown as Live;
// everything configurable says Coming soon. Removed by decision (25 Jul):
// proactive nudges, nudge timing, quiet hours, languages.
const DOCS = ["10th marksheet", "12th marksheet", "NEET scorecard", "Passport", "Photo"];

export default function SettingsScreen({
  me, role, college, onExport,
}: { me: string; role: string; college: string; onExport: () => void }) {
  const Sec = ({ t, ws, d }: { t: string; ws?: boolean; d?: string }) => (
    <div className="set-sec">
      <span className="t">{t}</span>
      {ws && <span className="ws">WORKSPACE</span>}
      {d && <span className="d">{d}</span>}
    </div>
  );
  const Row = ({ t, d, children }: { t: string; d?: string; children?: React.ReactNode }) => (
    <div className="set-row">
      <div className="a"><b>{t}</b>{d && <em>{d}</em>}</div>
      <div className="b">{children}</div>
    </div>
  );
  return (
    <div className="results-pane" style={{ paddingTop: 6 }}>
      <div className="setwrap">
        <h1>Settings</h1>
        <div className="setsub">Everything here is per-college unless marked workspace. You&apos;re viewing {college || "your college"}.</div>

        <Sec t="Admissions" d="What Maya collects and where things go." />
        <div className="set-card">
          <Row t="Required documents" d="The checklist every family completes">
            <div className="doclist">{DOCS.map((d) => <span key={d}>{d}</span>)}</div>
          </Row>
          <Row t="Edit checklist" d="Changes update Maya's prompt instantly">
            <span className="soon">Coming soon</span>
          </Row>
          <Row t="Booking amount" d="Set in Razorpay · shown when the NOA is ready">
            <span className="val">₹50,000</span><span className="soon">Copy link soon</span>
          </Row>
          <Row t="NOA mailbox" d="Maya watches this inbox for the college's reply">
            <span className="live">Live</span>
          </Row>
          <Row t="Requisition emails" d="To and Cc for the document packet">
            <span className="soon">Coming soon</span>
          </Row>
        </div>

        <Sec t="Maya" d="How she behaves in this college's chats." />
        <div className="set-card">
          <Row t="Handoff WhatsApp" d="Pinged when a family asks for a person">
            <span className="soon">With the handoff build</span>
          </Row>
          <Row t="Handoff email" d="Copied on every handoff">
            <span className="soon">With the handoff build</span>
          </Row>
        </div>

        <Sec t="Team &amp; access" ws d="Names here are what families and logs see." />
        <div className="set-card">
          <Row t={me} d={`Replies as \u201C${me}\u201D`}>
            <span className="val" style={{ textTransform: "capitalize" }}>{role}</span>
          </Row>
          <Row t="Add counsellor" d="Name, WhatsApp, and role">
            <span className="soon">Coming soon</span>
          </Row>
          <Row t="Change password">
            <span className="soon">Coming soon</span>
          </Row>
        </div>

        <Sec t="Notifications" ws d="WhatsApp pings and the daily digest." />
        <div className="set-card">
          <Row t="WhatsApp alerts" d="Pings for new leads and stage updates">
            <span className="live">On</span>
          </Row>
          <Row t="Daily digest" d="Yesterday's numbers, every morning at 9:00 AM">
            <span className="val">Email + WhatsApp</span><span className="live">On</span>
          </Row>
          <Row t="Digest recipients" d="Who receives the morning summary">
            <span className="soon">Coming soon</span>
          </Row>
        </div>

        <Sec t="Knowledge" d="Fees, booking amounts, and media live as rows in one sheet." />
        <div className="set-card">
          <Row t="Knowledge base" d="Google Sheet Maya answers from">
            <span className="soon">Link coming soon</span>
          </Row>
        </div>

        <Sec t="Data" d="Your leads are yours." />
        <div className="set-card">
          <Row t="Export leads" d="Every lead as CSV, from the table view">
            <button className="pillbtn" onClick={onExport}>Open table →</button>
          </Row>
        </div>
      </div>
    </div>
  );
}
