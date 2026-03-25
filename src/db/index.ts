import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("NEON_DATABASE_URL or DATABASE_URL is not configured.");
  }
  return url;
}

export const db = drizzle(neon(getDatabaseUrl()), { schema });
