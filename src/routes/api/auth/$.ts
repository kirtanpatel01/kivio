import { auth } from "#/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

function checkAuthConfig(): string | null {
  const dbUrl =
    (typeof process !== "undefined" && process.env?.NEON_DATABASE_URL) ||
    (typeof globalThis !== "undefined" && (globalThis as any).env?.NEON_DATABASE_URL);
  if (!dbUrl) {
    return "Database not configured: NEON_DATABASE_URL is missing in Cloudflare environment variables.";
  }

  const clientId =
    (typeof process !== "undefined" && process.env?.GOOGLE_CLIENT_ID) ||
    (typeof globalThis !== "undefined" && (globalThis as any).env?.GOOGLE_CLIENT_ID);
  if (!clientId) {
    return "Google OAuth not configured: GOOGLE_CLIENT_ID is missing in Cloudflare environment variables.";
  }

  const clientSecret =
    (typeof process !== "undefined" && process.env?.GOOGLE_CLIENT_SECRET) ||
    (typeof globalThis !== "undefined" && (globalThis as any).env?.GOOGLE_CLIENT_SECRET);
  if (!clientSecret) {
    return "Google OAuth not configured: GOOGLE_CLIENT_SECRET is missing in Cloudflare environment variables.";
  }

  const secret =
    (typeof process !== "undefined" && process.env?.BETTER_AUTH_SECRET) ||
    (typeof globalThis !== "undefined" && (globalThis as any).env?.BETTER_AUTH_SECRET);
  if (!secret) {
    return "Auth secret not configured: BETTER_AUTH_SECRET is missing in Cloudflare environment variables.";
  }

  return null;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const configError = checkAuthConfig();
        if (configError) {
          console.error(`[Auth Config Error]: ${configError}`);
          return new Response(
            JSON.stringify({
              error: configError,
              message: configError,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        try {
          return await auth.handler(request);
        } catch (error) {
          console.error("[Auth GET Error]:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown auth error",
              message: error instanceof Error ? error.message : "Unknown auth error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
      POST: async ({ request }: { request: Request }) => {
        const configError = checkAuthConfig();
        if (configError) {
          console.error(`[Auth Config Error]: ${configError}`);
          return new Response(
            JSON.stringify({
              error: configError,
              message: configError,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        try {
          return await auth.handler(request);
        } catch (error) {
          console.error("[Auth POST Error]:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown auth error",
              message: error instanceof Error ? error.message : "Unknown auth error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
