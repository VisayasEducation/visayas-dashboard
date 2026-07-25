"use client";
// RESULTS v2.5 — the prototype's numeric screen, exactly: narrative headline,
// five-cell stat strip, stuck-lead banner, pipeline with days, insight line.
// Zero states are words, never bare zeros. Renders contained beside the list.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const ORDER: [string, string][] = [
  ["new", "New"], ["engaged", "Engaged"], ["eligible", "Eligible"],
  ["docs", "Docs"], ["noa", "NOA"], ["payment_due", "Payment"], ["converted", "Done"],
];
const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export default function ResultsScreen({ onStage }: { onStage: (state: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(90);
  const [showCustom, setShowCustom] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback((d: number, f?: string, t?: string) => {
    api.analytics(d, f, t).then(setData).catch(() => {});
  }, []);
  useEffect(() => { load(days); }, [days, load]);

  if (!data) return <div className="empty">Loading results…</div>;

  const counts: Record<string, number> = {};
  data.funnel.forEach((x: any) => (counts[x.stage] = x.count));
  const total = ORDER.reduce((s, [k]) => s + (counts[k] || 0), 0);
  const conv = counts["converted"] || 0;
  const ins = data.insights || {};
  const captured = data.money?.captured || 0;
  const inMotion = data.money?.in_motion || 0;
  const stuck = ins.stuck || 0;
  const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

  // ---- narrative headline (word zero-states, no fake numbers) ----
  const ratio = conv > 0 ? Math.max(1, Math.round(total / conv)) : 0;
  const line1 =
    total === 0 ? "Waiting for the first family."
    : conv > 0 ? `One in ${WORDS[ratio] || ratio} converts.`
    : "No conversions yet.";
  const line2 =
    total === 0 ? "Everything here fills in as families write."
    : ins.days_in_docs != null ? `Documents is where they wait — ${ins.days_in_docs} days, usually one missing file.`
    : stuck > 0 ? `Documents is where they wait — ${stuck} waiting now.`
    : "Every stage is moving — nothing is stuck today.";

  const rangeLabel = showCustom && from && to ? "custom" : `${days}D`;

  const Cell = ({ l, v, s, cls }: { l: string; v: string; s?: string; cls?: string }) => (
    <div className="rs-cell">
      <div className="l">{l}</div>
      <div className={`v ${cls || ""}`}>{v}</div>
      <div className="s">{s || "\u00A0"}</div>
    </div>
  );

  return (
    <div className="rhead2">
      <h1>{line1}<br /><span className="dim">{line2}</span></h1>

      <div className="r-range" style={{ margin: "16px 0 0" }}>
        {[7, 30, 90].map((d) => (
          <button key={d} className={`rr ${days === d && !showCustom ? "on" : ""}`}
            onClick={() => { setShowCustom(false); setDays(d); }}>{d}D</button>
        ))}
        <button className={`rr custom ${showCustom ? "on" : ""}`}
          onClick={() => setShowCustom((v) => !v)}>Custom ▾</button>
      </div>
      {showCustom && (
        <div className="r-custom">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span>→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="r-apply" disabled={!from || !to}
            onClick={() => load(days, from, to)}>Apply</button>
        </div>
      )}

      <div className="rstat">
        {captured > 0
          ? <Cell l="Collected" v={inr(captured)} s="bank-verified" cls="grn" />
          : <Cell l="Collected" v="No payments yet" cls="zero" />}
        {inMotion > 0
          ? <Cell l="In motion" v={inr(inMotion)} s="committed" />
          : <Cell l="In motion" v="Nothing committed yet" cls="zero" />}
        {total > 0
          ? <Cell l="Leads" v={String(total)} s={rangeLabel} />
          : <Cell l="Leads" v="None yet" cls="zero" />}
        {conv > 0
          ? <Cell l="Conversion" v={`${Math.round((conv / Math.max(1, total)) * 100)}%`} s={`${conv} of ${total}`} />
          : <Cell l="Conversion" v="None yet" cls="zero" />}
        {ins.days_to_pay != null
          ? <Cell l="Median to done" v={`${ins.days_to_pay}d`} s="first hi → paid" />
          : <Cell l="Median to done" v="No completions yet" cls="zero" />}
      </div>

      {stuck > 0 && (
        <div className="rbanner">
          <div>
            <b>{stuck === 1 ? "1 lead is" : `${stuck} leads are`} sitting in Docs</b>
            <span>waiting on documents — oldest first</span>
          </div>
          <button onClick={() => onStage("docs")}>
            See the stuck {stuck === 1 ? "lead" : "leads"} →</button>
        </div>
      )}

      <div className="rcard2">
        <div className="h">
          <span className="t">Pipeline</span>
          <span className="m">counts · click any stage to open chats</span>
        </div>
        <div className="pipe">
          {ORDER.map(([k, label]) => {
            const c = counts[k] || 0;
            const cls =
              k === "docs" && stuck > 0 ? "amber"
              : k === "converted" && c > 0 ? "done"
              : c === 0 ? "dim" : "";
            return (
              <div key={k} className={`pcell ${cls}`} onClick={() => onStage(k)}>
                <div className={`n ${k === "converted" && c > 0 ? "grn" : ""}`}>{c}</div>
                <div className="lb">{label}</div>
                <div className="d">{k === "docs" && ins.days_in_docs != null ? `${ins.days_in_docs}d` : ""}</div>
              </div>
            );
          })}
        </div>
        {stuck > 0
          ? <div className="pinsight">Most stalls are one missing file.</div>
          : conv > 0
          ? <div className="pinsight">Families that reach Payment finish.</div>
          : null}
      </div>
    </div>
  );
}
