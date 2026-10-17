import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const url =
    (typeof process !== "undefined" && process.env?.NEON_DATABASE_URL) ||
    (typeof globalThis !== "undefined" && (globalThis as any).env?.NEON_DATABASE_URL);
  if (!url) {
    throw new Error(
      "NEON_DATABASE_URL is not configured. Please add NEON_DATABASE_URL in the Cloudflare Dashboard under Workers & Pages -> kivio -> Settings -> Variables and Secrets.",
    );
  }
  return url;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _db = drizzle(neon(getDatabaseUrl()), { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
