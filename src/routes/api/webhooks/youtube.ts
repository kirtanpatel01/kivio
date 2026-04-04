import { XMLParser } from "fast-xml-parser";
import { syncVideoAndNotifySubscribers } from "#/actions/sync-notify";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/youtube")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        console.log("[webhook GET] url: ", url);
        const hubMode = url.searchParams.get("hub.mode");
        console.log("[webhook GET] hubMode: ", hubMode);
        const hubChallenge = url.searchParams.get("hub.challenge");
        console.log("[webhook GET] hubChallenge: ", hubChallenge);
        const hubTopic = url.searchParams.get("hub.topic");
        console.log("[webhook GET] hubTopic: ", hubTopic);
        const hubLease = url.searchParams.get("hub.lease_seconds");
        console.log("[webhook GET] hubLease: ", hubLease);

        console.log(
          `[WebhookVerify] Hub verified Topic: ${hubTopic} with mode ${hubMode}`,
        );

        // Return challenge to confirm subscription
        return new Response(hubChallenge, { status: 200 });
      },
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          console.log("[webhook POST] body: ", body);
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
          });
          console.log("[webhook POST] parser: ", parser);
          const jsonObj = parser.parse(body);
          console.log("[webhook POST] jsonObj: ", jsonObj);

          // Extract entry from Atom Feed
          const entry = jsonObj.feed?.entry;
          if (!entry) {
            console.warn("[WebhookPing] No entry found in Atom Feed.");
            return new Response("No entry", { status: 200 });
          }
          console.log("[webhook POST] entry: ", entry);

          // In Atom feeds, these might be prefixes like yt:videoId
          // Depending on the parser, it might be entry["yt:videoId"] or similar
          const videoId = entry["yt:videoId"];
          const channelId = entry["yt:channelId"];
          console.log("[webhook POST] videoId: ", videoId);
          console.log("[webhook POST] channelId: ", channelId);

          // Run sync in background (don't block the webhook response)
          if (videoId && channelId) {
            console.log(
              "[webhook POST] syncVideoAndNotifySubscribers: ",
            );
            syncVideoAndNotifySubscribers(videoId, channelId).catch((err) => {
              console.error("[WebhookSync] Background sync failed:", err);
            });
            return new Response("OK", { status: 200 });
          }

          console.warn(
            "[WebhookPing] Could not extract videoId or channelId from entry:",
            entry,
          );
          return new Response("Invalid entry format", { status: 400 });
        } catch (error: any) {
          console.error("[WebhookPing] Error parsing XML body:", error);
          return new Response("Invalid XML", { status: 400 });
        }
      },
    },
  },
});
