"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const ORDER: [string, string][] = [
  ["new", "New"], ["engaged", "Engaged"], ["eligible", "Eligible"],
  ["docs", "Docs"], ["noa_requested", "NOA"], ["payment_due", "Payment"], ["converted", "Done"],
];

export default function ResultsScreen({ onStage }: { onStage: (state: string) => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.analytics>> | null>(null);
  useEffect(() => { api.analytics().then(setData).catch(() => {}); }, []);
  if (!data) return <div className="empty">Loading results…</div>;

  const counts: Record<string, number> = {};
  data.funnel.forEach((f) => (counts[f.stage] = f.count));
  const top = Math.max(1, counts["new"] || 0);
  const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

  return (
    <div className="results">
      <div className="r-eyebrow">Results · UV Gullas</div>
      <div className="r-head">
        <h1>Where every lead is, and where the money stands.</h1>
        <div className="r-range">
          <button className="rr">7D</button><button className="rr">30D</button>
          <button className="rr on">90D</button><button className="rr custom">Custom ▾</button>
        </div>
      </div>

      <div className="r-card funnel">
        <div className="funnel-h"><span className="t">Admission funnel</span>
          <span className="m">{top} leads</span></div>
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