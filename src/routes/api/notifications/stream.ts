import { createFileRoute } from "@tanstack/react-router";
import { notificationEvents, NOTIFICATION_EVENT } from "#/lib/notification-events";
import { ensureSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/api/notifications/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await ensureSession();
          const userId = session.user.id;

          if (!userId) {
            return new Response("Unauthorized", { status: 401 });
          }

          const stream = new ReadableStream({
            start(controller) {
              // Immediately flush connection headers to client
              controller.enqueue(new TextEncoder().encode(": connected\n\n"));

              // Create the listener for this user
              const listener = (data: { userId: string }) => {
                if (data.userId === userId) {
                  try {
                    const message = `data: ${JSON.stringify({ type: "refresh" })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(message));
                  } catch {
                    notificationEvents.off(NOTIFICATION_EVENT, listener);
                  }
                }
              };

              // Register the listener
              notificationEvents.on(NOTIFICATION_EVENT, listener);

              // Keep-alive heartbeat every 15 seconds to prevent timeouts
              const heartbeat = setInterval(() => {
                try {
                  controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
                } catch {
                  clearInterval(heartbeat);
                }
              }, 15000);

              // Cleanup when client disconnects
              request.signal.addEventListener("abort", () => {
                notificationEvents.off(NOTIFICATION_EVENT, listener);
                clearInterval(heartbeat);
                try {
                  controller.close();
                } catch {
                  // Ignore if already closed
                }
              });
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
        } catch (error) {
          return new Response("Unauthorized", { status: 401 });
        }
      },
    },
  },
});
