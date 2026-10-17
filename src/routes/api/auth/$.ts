import { auth } from "#/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          return await auth.handler(request);
        } catch (error) {
          console.error("[Auth GET Error]:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown auth error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          return await auth.handler(request);
        } catch (error) {
          console.error("[Auth POST Error]:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown auth error",
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
