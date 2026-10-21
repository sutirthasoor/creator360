import { PARTNER } from "./partnerConfig.js";

// Partner sign-in goes through our own Node server (which uses Firebase Authentication behind
// the scenes). The session is kept in localStorage; the ID token is refreshed before it expires.
const KEY = "cm365.partner.session";

async function post(path, body, token) {
  let res;
  try {
    res = await fetch(`${PARTNER.apiBase}/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body || {}),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function decode(idToken) {
  try {
    const p = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(p))));
  } catch {
    return {};
  }
}

const toSession = (d) => ({
  idToken: d.idToken, refreshToken: d.refreshToken, expiresAt: Date.now() + Number(d.expiresIn || 3600) * 1000,
  uid: d.uid, email: d.email,
});

export const readSession = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
};
const write = (s) => {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* private mode */ }
};

export async function signUp(email, password) {
  const s = toSession(await post("signup", { email, password }));
  write(s);
  return s;
}

export async function signIn(email, password) {
  const s = toSession(await post("signin", { email, password }));
  write(s);
  return s;
}

export const sendPasswordReset = (email) => post("reset", { email });

export async function resendVerification() {
  const s = await freshSession();
  if (!s) throw new Error("Please sign in first.");
  await post("resend", {}, s.idToken);
}

async function refresh(s) {
  try {
    const data = await post("refresh", { refreshToken: s.refreshToken });
    const next = { ...s, ...toSession({ ...data, uid: data.uid || s.uid, email: data.email || s.email }) };
    write(next);
    return next;
  } catch (e) {
    if (/expired|sign in again/i.test(e.message)) { write(null); return null; }
    throw e;
  }
}

// Returns a session whose ID token is valid for at least another minute (or null).
// force is used after verifying an email so the new claim reaches the server.
export async function freshSession({ force = false } = {}) {
  const s = readSession();
  if (!s) return null;
  if (!force && s.expiresAt - Date.now() > 60_000) return s;
  try { return await refresh(s); } catch { return s.expiresAt > Date.now() ? s : null; }
}

export const signOut = () => write(null);
export const claimsOf = (s) => (s ? decode(s.idToken) : {});
