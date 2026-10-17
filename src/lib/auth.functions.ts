import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";

// Short-lived session cache (keyed by cookie) to eliminate duplicate DB lookups in parallel actions
const sessionCache = new Map<string, { session: any; expiresAt: number }>();
const SESSION_CACHE_TTL_MS = 20_000; // 20 seconds

async function resolveSession() {
  const headers = getRequestHeaders();
  const cookie = headers.get("cookie") || "";

  const now = Date.now();
  if (cookie) {
    const cached = sessionCache.get(cookie);
    if (cached && cached.expiresAt > now) {
      return cached.session;
    }
  }

  const session = await auth.api.getSession({ headers });

  if (cookie && session) {
    sessionCache.set(cookie, { session, expiresAt: now + SESSION_CACHE_TTL_MS });
    if (sessionCache.size > 200) {
      for (const [k, v] of sessionCache.entries()) {
        if (v.expiresAt <= now) sessionCache.delete(k);
      }
    }
  }

  return session;
}

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return await resolveSession();
  },
);

export const ensureSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await resolveSession();

    if (!session) {
      throw new Error("Unauthorized");
    }

    return session;
  },
);

