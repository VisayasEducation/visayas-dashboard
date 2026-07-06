"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const ORDER: [string, string][] = [
  ["new", "New"], ["engaged", "Engaged"], ["eligible", "Eligible"],
  ["docs", "Docs"], ["noa_requested", "NOA"], ["payment_due", "Payment"], ["converted", "Done"],
];

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
  const top = Math.max(1, ...ORDER.map(([k]) => counts[k] || 0));
  const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");
  const ins = data.insights || {};

  return (
    <div className="results">
      <div className="r-eyebrow">Results · UV Gullas</div>
      <div className="r-head">
        <h1>Where every lead is, and where the money stands.</h1>
        <div className="r-range">
          {[7, 30, 90].map((d) => (
            <button key={d} className={`rr ${days === d && !showCustom ? "on" : ""}`}
              onClick={() => { setShowCustom(false); setDays(d); }}>{d}D</button>
          ))}
          <button className={`rr custom ${showCustom ? "on" : ""}`}
            onClick={() => setShowCustom((v) => !v)}>Custom ▾</button>
        </div>
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

      <div className="r-card funnel">
        <div className="funnel-h"><span className="t">Admission funnel</span>
          <span className="m">{total} leads</span></div>
        <div className="bars">
          {ORDER.map(([k, label], i) => {
            const c = counts[k] || 0;
            const h = Math.max(8, Math.round((c / top) * 100));
            const prev = i > 0 ? (counts[ORDER[i - 1][0]] || 0) : c;
            const drop = i > 0 && prev > 0 ? Math.round(((c - prev) / prev) * 100) : 0;
            const cls = k === "docs" ? "amber" : k === "converted" ? "done" : "";
            return (
              <div className="col" key={k} onClick={() => onStage(k)}>
                <div className={`bar ${cls}`} style={{ height: `${h}%` }}>{c}</div>
                <div className="cap"><div className="n">{label}
                  {drop < 0 ? <span className="dr"> {drop}%</span> : null}</div></div>
              </div>
            );
          })}
        </div>
        <div className="fhint">Click any stage → opens Chats, filtered.</div>
      </div>

      <div className="r3">
        <div className="r-card ins amber">
          <div className="big">{ins.days_in_docs != null ? `${ins.days_in_docs} days in Docs` : "Docs"}</div>
          <p>The slowest room — most stalls are one missing file.</p>
          <button className="stuck" onClick={() => onStage("docs")}>
            See the <b>{ins.stuck || 0}</b> stuck leads ↗</button>
        </div>
        <div className="r-card ins">
          <div className="big">{ins.days_to_pay != null ? `${ins.days_to_pay} days` : "Not yet"}</div>
          <p>{ins.days_to_pay != null ? "Median first message → payment." : "No leads have reached payment yet."}</p>
        </div>
        <div className="r-card ins">
          <div className="big g">{ins.maya_pct || 0}% Maya-driven</div>
          <p>Share of conversations Maya handled end-to-end.</p>
        </div>
      </div>

      <div className="r-msec"><h2>The money, honestly</h2>
        <span className="n">Every figure is a payment-system fact.</span></div>
      <div className="r-mg">
        <div className="r-card money conf"><div className="l">Confirmed · captured</div>
          <div className="a">{inr(data.money.captured)}</div><div className="s">Razorpay receipts.</div></div>
        <div className="r-card money mot"><div className="l">In motion</div>
          <div className="a">{inr(data.money.in_motion)}</div><div className="s">committed · not captured.</div></div>
        <div className="r-card money"><div className="l">Converted</div>
          <div className="a plain">{data.money.converted}</div><div className="s">seats.</div></div>
      </div>
    </div>
  );
}