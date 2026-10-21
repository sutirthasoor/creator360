import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as pa from "../lib/partnerAuth.js";
import { api } from "../lib/affiliateApi.js";
import { isPartnerAuthConfigured } from "../lib/partnerConfig.js";

// Partner (influencer + admin) sign-in. Separate from the shopper's Shopify account:
// partners use email + password through Firebase, and roles are enforced by the server.
const Ctx = createContext(null);

export function PartnerProvider({ children }) {
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(pa.readSession() ? "loading" : "guest");
  const [error, setError] = useState(null);

  const load = useCallback(async ({ force = false } = {}) => {
    const s = await pa.freshSession({ force });
    if (!s) { setMe(null); setStatus("guest"); return null; }
    try {
      const data = await api("/me");
      setMe(data);
      setStatus("authed");
      return data;
    } catch (e) {
      if (e.status === 401) { pa.signOut(); setMe(null); setStatus("guest"); }
      else { setError(e.message); setStatus("error"); }
      return null;
    }
  }, []);

  useEffect(() => {
    if (pa.readSession()) load();
  }, [load]);

  const value = useMemo(() => ({
    me, status, error, configured: isPartnerAuthConfigured,
    isAdmin: Boolean(me && ["admin", "super_admin"].includes(me.role)),
    refresh: load,
    async signIn(email, password) { await pa.signIn(email, password); return load(); },
    async signUp(email, password) { await pa.signUp(email, password); return load(); },
    reset: pa.sendPasswordReset,
    resend: pa.resendVerification,
    signOut() { pa.signOut(); setMe(null); setStatus("guest"); },
  }), [me, status, error, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePartner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePartner must be used inside <PartnerProvider>");
  return v;
}
