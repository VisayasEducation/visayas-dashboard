"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!username.trim() || !pw) { setErr("Please enter your username and password."); return; }
    setErr(""); setBusy(true);
    try {
      const r = await api.login(username.trim(), pw);
      localStorage.setItem("maya_token", r.token);
      localStorage.setItem("maya_name", r.name || "");
      location.href = "/";
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      setErr(msg.includes("incorrect")
        ? "Username or password is incorrect."
        : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign in</h1>
        {err && <div className="login-err"><span>✕</span> {err}</div>}
        <div className="login-field">
          <label>Username</label>
          <input type="text" value={username} autoComplete="username"
                 placeholder="your username"
                 onChange={(e) => setUsername(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <div className="login-field">
          <label>Password</label>
          <div className="login-pw">
            <input type={show ? "text" : "password"} value={pw} autoComplete="current-password"
                   placeholder="••••••••"
                   onChange={(e) => setPw(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button type="button" className="peek" onClick={() => setShow(!show)}>
              {show ? "hide" : "show"}
            </button>
          </div>
        </div>
        <button className="login-btn" onClick={submit} disabled={busy}>
          {busy ? "…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}