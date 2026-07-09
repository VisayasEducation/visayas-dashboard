// src/lib/api.ts — the one place that talks to the backend.
// When login lands, add the auth header in the `headers` below — nothing else changes.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
export const BUSINESS_ID = process.env.NEXT_PUBLIC_BUSINESS_ID || "";

export type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  state: string | null;
  concern: string | null;
  driven_by: "maya" | "human";
  gate_count: number;
  docs_done: number;
  docs_total: number;
  city?: string | null;
  source?: string | null;
  last_inbound_at: string | null;
  window_open: boolean;
  window_seconds_left: number;
  requisition_sent?: boolean;
  updated_at: string;
  created_at: string;
};

export type Board = {
  business_id: string;
  counts: Record<string, number>;
  total: number;
  board: Record<string, Lead[]>;
};

export type TimelineEvent = {
  kind: "message" | "event";
  ts: string;
  data: any;
};

export type Requisition = {
  lead_id: string;
  name: string | null;
  state: string | null;
  draft: { to: string; cc: string; subject: string; body: string };
  files: { filename: string; url: string }[];
  docs_complete: boolean;
  already_sent: boolean;
};

export type Brain = {
  lead_id: string;
  state: string;
  identity: {
    name: string | null;
    student_name: string | null;
    source: string | null;
    campaign: string | null;
    reply_language: string | null;
    languages_used: string[];
    city: string | null;
    asking_for: string | null;
    neet_status: string | null;
    neet_score: number | null;
    pcb: number | null;
    pass_year: number | null;
    concern: string | null;
    concerns: string[];
  };
  learning: { items: { key: string; label: string; done: boolean; value: string | null }[]; next: string | null };
  docs: { items: { key: string; label: string; done: boolean }[]; done: number; total: number };
  payment: { due: number | null; paid: number; confirmed_at: string | null };
  gate_count: number;
  journey_days: number | null;
  driven_by: string;
};

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("maya_token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: headers() });
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("maya_token");
    if (!location.pathname.startsWith("/login")) location.href = "/login";
  }
  if (!res.ok) {
    let detail = await res.text();
    try {
      detail = JSON.parse(detail).detail || detail;
    } catch {}
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    req<{ token: string; name: string; username: string }>(`/api/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  board: () => req<Board>(`/api/leads?business_id=${BUSINESS_ID}`),
  detail: (id: string) => req<{ lead: Lead }>(`/api/leads/${id}`),
  timeline: (id: string) =>
    req<{ lead_id: string; events: TimelineEvent[] }>(`/api/leads/${id}/timeline`),
  brain: (id: string) => req<Brain>(`/api/leads/${id}/brain`),
  send: (id: string, text: string, sender_name: string) =>
    req<{ ok: boolean }>(`/api/leads/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ text, sender_name }),
    }),
  takeover: (id: string, driver: "maya" | "human", by: string) =>
    req<{ ok: boolean; driven_by: string }>(`/api/leads/${id}/takeover`, {
      method: "POST",
      body: JSON.stringify({ driver, by }),
    }),
  analytics: (days = 90, from?: string, to?: string) => {
    let q = `?business_id=${BUSINESS_ID}&days=${days}`;
    if (from && to) q += `&date_from=${from}&date_to=${to}`;
    return req<any>(`/api/analytics${q}`);
  },
  noaAction: (id: string, action: "received" | "more_docs") =>
    req<{ ok: boolean; state: string | null }>(`/api/leads/${id}/noa`, {
      method: "POST", body: JSON.stringify({ action }),
    }),
  requisition: (id: string) => req<Requisition>(`/api/leads/${id}/requisition`),
  sendRequisition: (
    id: string,
    payload: { to: string; cc: string; subject: string; body: string; by: string }
  ) =>
    req<{ ok: boolean; state: string | null; files_sent: number }>(
      `/api/leads/${id}/requisition/send`,
      { method: "POST", body: JSON.stringify(payload) }
    ),
  downloadDocs: async (id: string, name: string) => {
    const res = await fetch(`${API_BASE}/api/leads/${id}/documents.zip`, { headers: headers() });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/ /g, "_")}_${id.slice(0, 8)} Documents.zip`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
};

// ---------------- payments & document verification ----------------
export type PaymentLedger = {
  items: { amount_paise: number; method: string | null; by: string | null; at: string }[];
  paid_paise: number; goal_paise: number; balance_paise: number;
  razorpay_link_url: string | null;
  expected_visit?: string | null; counsellor?: string | null;
};

export const getPayments = (leadId: string) =>
  req<PaymentLedger>(`/api/leads/${leadId}/payments`);

export const recordOfficePayment = (leadId: string, amount_rupees: number,
                                    staff_name: string, note = "",
                                    idempotency_key = "") =>
  req<{ ok: boolean; converted?: boolean; duplicate?: boolean;
        paid_paise?: number; goal_paise?: number }>(
      `/api/leads/${leadId}/payments/manual`,
      { method: "POST", body: JSON.stringify({ amount_rupees, staff_name, note, idempotency_key }) });

export const resendPaymentLink = (leadId: string) =>
  req(`/api/leads/${leadId}/payments/resend-link`, { method: "POST" });

export const verifyFlaggedDoc = (leadId: string, slot: string, ok: boolean, staff_name: string) =>
  req(`/api/leads/${leadId}/docs/${slot}/verify`,
      { method: "POST", body: JSON.stringify({ ok, staff_name }) });

export const sendOriginalAgain = (leadId: string) =>
  req(`/api/leads/${leadId}/noa/send-original`, { method: "POST" });

export const assignCounsellor = (leadId: string, counsellor: string, staff_name: string) =>
  req(`/api/leads/${leadId}/handoff/assign`,
      { method: "POST", body: JSON.stringify({ counsellor, staff_name }) });

export const setExpectedVisit = (leadId: string, expected_visit: string) =>
  req(`/api/leads/${leadId}/visit`, { method: "POST", body: JSON.stringify({ expected_visit }) });

export const paymentsSummary = (days = 7) =>
  req<{ collected_paise: number; pending: number; overdue: number }>(
    `/api/payments/summary?days=${days}`);
