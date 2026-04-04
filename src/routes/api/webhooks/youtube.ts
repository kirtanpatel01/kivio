import { XMLParser } from "fast-xml-parser";
import { syncVideoAndNotifySubscribers } from "#/actions/sync-notify";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/youtube")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const hubChallenge = url.searchParams.get("hub.challenge");

        // Return challenge to confirm subscription
        return new Response(hubChallenge, { status: 200 });
      },
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
          });
          const jsonObj = parser.parse(body);

          // Extract entry from Atom Feed
          let entry = jsonObj.feed?.entry;

          // YouTube often sends an array of entries. We want the newest one (first one).
          if (Array.isArray(entry)) {
            entry = entry[0];
          }

          if (!entry) {
            return new Response("No entry", { status: 200 });
          }

          // In Atom feeds, tags like <yt:videoId> are often parsed as "yt:videoId"
          // We add a few fallbacks just in case the parser behaves differently
          const videoId = entry["yt:videoId"] || entry.id?.split(":").pop();
          const channelId =
            entry["yt:channelId"] || entry["author"]?.uri?.split("/").pop();

          // Run sync in background (don't block the webhook response)
          if (videoId && channelId) {
            syncVideoAndNotifySubscribers(videoId, channelId).catch((err) => {
              console.error("[WebhookSync] Background sync failed:", err);
            });
            return new Response("OK", { status: 200 });
          }

          return new Response("Invalid entry format", { status: 400 });
        } catch (error: any) {
          console.error("[WebhookPing] Error parsing XML body:", error);
          return new Response("Invalid XML", { status: 400 });
        }
      },
    },
  },
});
