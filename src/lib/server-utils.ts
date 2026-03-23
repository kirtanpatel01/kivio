import { resolve } from "node:path";
import { readFileSync } from "node:fs";

export function getEnvVar(key: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  if (process.env[key]) return process.env[key];
  try {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed) continue;
      const [k, ...rest] = trimmed.split("=");
      if (k?.trim() === key) return rest.join("=").trim();
    }
  } catch {
    // .env file doesn't exist
  }
  return undefined;
}

