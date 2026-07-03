# Maya Dashboard (web)

The counsellor-facing inbox for the UV Gullas WhatsApp AI, built in Next.js.
It talks to the existing `visayas-whatsapp-ai` FastAPI backend over its API —
it holds no database or WhatsApp logic of its own (clean boundary).

Login lands next; the code is structured for it (auth header goes in one place:
`src/lib/api.ts` → `headers()`; the signed-in name replaces the `ME` constant).

---

## Run locally

```bash
npm install
cp .env.example .env.local     # then edit the two values
npm run dev                     # http://localhost:3000
```

`.env.local`:
```
NEXT_PUBLIC_API_BASE=https://your-backend.onrender.com
NEXT_PUBLIC_BUSINESS_ID=861f53fe-75b3-4689-8261-0d0159e119f9
```

---

## Deploy on Render (static/Node web service)

1. Push this repo to GitHub (new repo — separate from the backend).
2. Render → New → Web Service → pick this repo.
3. Environment: **Node**. Build: `npm install && npm run build`. Start: `npm start`.
4. Add the two env vars (`NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_BUSINESS_ID`).
5. Deploy → open the service URL.

(Vercel also works and is one-click for Next.js — either is fine.)

---

## CORS

The backend must allow this dashboard's origin. Already added in `main.py`:
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```
After deploy, tighten `allow_origins` to your dashboard's real URL.

---

## Structure

```
src/lib/api.ts               all backend calls (the one boundary; auth goes here)
src/lib/ui.ts                small presentation helpers
src/components/ConversationList.tsx   left column: the conversation list + filters
src/components/ThreadPanel.tsx        right column: open chat, AI toggle, composer
src/app/page.tsx             the inbox page (state, polling, wiring)
src/app/globals.css          the v3 design tokens
```

## Rules it enforces (via the backend)
- AI toggle = `driven_by`. `human` = Maya silent; `maya` = Maya answers.
- A human can't send while AI is on — take over first.
- 24-hour window applies to humans too — send is blocked when closed.
- Every takeover is recorded as an immutable `event`.

## Not yet (next steps)
- Login (username/password). CORS tighten. Multi-college switcher. Real-time push
  (currently 20s polling).
