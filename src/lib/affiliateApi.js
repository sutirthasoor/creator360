import { PARTNER } from "./partnerConfig.js";
import { freshSession } from "./partnerAuth.js";

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Calls the affiliate server. Sends the signed-in user's Firebase ID token when there is one.
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const s = await freshSession();
    if (!s) throw new ApiError("Please sign in.", 401);
    headers.Authorization = `Bearer ${s.idToken}`;
  }
  let res;
  try {
    res = await fetch(`${PARTNER.apiBase}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", res.status);
  return data;
}

export const inr = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: paise % 100 ? 2 : 0 }).format((paise || 0) / 100);

export const pct = (n) => `${(n * 100).toFixed(1)}%`;
export const rateText = (r) => (!r ? "" : r.type === "percent" ? `${r.bps / 100}%` : `${inr(r.paise)} / unit`);
