"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function UploadNoaModal({
  leadId, studentName, parentName, phone, college, amountPaise, me, onClose, onDone,
}: {
  leadId: string;
  studentName: string;
  parentName: string;
  phone: string;
  college: string;
  amountPaise: number | null;
  me: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const inr = (p: number | null) =>
    p == null ? "the booking amount" : "₹" + Math.round(p / 100).toLocaleString("en-IN");

  const initials = (studentName || "?").trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

  async function send() {
    if (!file || busy) return;
    setBusy(true); setErr("");
    try {
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1]);
        r.onerror = () => rej(new Error("Could not read the file"));
        r.readAsDataURL(file);
      });
      await api.noaUpload(leadId, file.name, b64, me);
      onDone("Letter sent");
    } catch (e: any) {
      setErr(String(e?.message || e).slice(0, 160));
      setBusy(false);
    }
  }

  const Tick = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         style={{ color: "var(--accent)", flex: "0 0 auto", marginTop: 3 }}>
      <path d="M20 6 9 17l-5-5" /></svg>
  );

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="upl">
        <div className="upl-h"><h3>Send the acceptance letter</h3></div>

        <div className="upl-who">
          <span className="upl-av">{initials}</span>
          <span>
            <div className="upl-nm">{studentName}</div>
            <div className="upl-sub">{parentName} · {phone} · {college}</div>
          </span>
        </div>

        <div className="upl-b">
          <p className="upl-lab">The letter</p>

          {!file ? (
            <label className="upl-drop">
              <input type="file" accept="application/pdf" style={{ display: "none" }}
                     onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className="upl-big">Choose the PDF</div>
              <div className="upl-small">One page, up to 8 MB</div>
            </label>
          ) : (
            <>
              <div className="upl-file">
                <span className="upl-ic">PDF</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div className="upl-fn">{file.name}</div>
                  <div className="upl-fm">{Math.round(file.size / 1024)} kB</div>
                </span>
                <button className="upl-rep" onClick={() => setFile(null)}>Replace</button>
              </div>

              <p className="upl-lab" style={{ margin: "18px 0 6px" }}>What they receive</p>
              <div className="upl-row"><Tick />
                <span>A black and white copy, stamped{" "}
                  <span className="upl-mono">original will be released after payment</span></span></div>
              <div className="upl-row"><Tick />
                <span>A request for the <b>{inr(amountPaise)}</b> booking payment</span></div>

              <div className="upl-warn">
                <span>⚠</span>
                <span>Check the name on the letter matches the student above.
                  This cannot be undone once sent.</span>
              </div>
            </>
          )}

          {err && <div className="upl-err">{err}</div>}
        </div>

        <div className="upl-f">
          <button className="upl-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="upl-send" onClick={send} disabled={!file || busy}>
            {busy ? "Sending…" : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
