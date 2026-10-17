import { XMLParser } from "fast-xml-parser";
import { syncVideoAndNotifySubscribers } from "#/actions/sync-notify";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "#/db";
import { youtubeChannels } from "#/db/schema";
import { eq } from "drizzle-orm";
import {
  extractChannelIdFromTopic,
  verifyHubSignature,
} from "#/lib/pubsub/websub";

export const Route = createFileRoute("/api/webhooks/youtube")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const hubMode = url.searchParams.get("hub.mode");
        const hubChallenge = url.searchParams.get("hub.challenge");
        const hubTopic = url.searchParams.get("hub.topic");
        const hubLease = url.searchParams.get("hub.lease_seconds");

        console.log(
          `[WebhookVerify] Received ${hubMode} request for topic: ${hubTopic}`,
        );

        if (!hubChallenge) {
          console.warn("[WebhookVerify] Missing hub.challenge in GET request.");
          return new Response("Missing hub.challenge", { status: 400 });
        }

        // Extract channel ID from topic URL if available
        const channelId = hubTopic
          ? extractChannelIdFromTopic(hubTopic)
          : null;

        if (hubMode === "subscribe") {
          // Record lease expiration time if lease seconds provided
          if (hubLease && channelId) {
            const leaseSeconds = Number(hubLease);
            if (!Number.isNaN(leaseSeconds) && leaseSeconds > 0) {
              const leaseExpiresAt = new Date(
                Date.now() + leaseSeconds * 1000,
              );
              await db
                .update(youtubeChannels)
                .set({ subscriptionLeaseExpiresAt: leaseExpiresAt })
                .where(eq(youtubeChannels.channelId, channelId))
                .catch((err) =>
                  console.error(
                    `[WebhookVerify] Failed to update lease for ${channelId}:`,
                    err,
                  ),
                );

              console.log(
                `[WebhookVerify] Subscription active for ${channelId}, lease expires at: ${leaseExpiresAt.toISOString()}`,
              );
            }
          }

          // Per WebSub spec: return hub.challenge with 200 OK
          return new Response(hubChallenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        if (hubMode === "unsubscribe") {
          if (channelId) {
            await db
              .update(youtubeChannels)
              .set({ subscriptionLeaseExpiresAt: null })
              .where(eq(youtubeChannels.channelId, channelId))
              .catch((err) =>
                console.error(
                  `[WebhookVerify] Failed to clear lease for ${channelId}:`,
                  err,
                ),
              );

            console.log(
              `[WebhookVerify] Unsubscribed successfully for ${channelId}`,
            );
          }

          return new Response(hubChallenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        if (hubMode === "denied") {
          console.warn(
            `[WebhookVerify] Hub denied subscription for topic: ${hubTopic}`,
          );
          return new Response("OK", { status: 200 });
        }

        return new Response("Unsupported hub.mode", { status: 400 });
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

          // YouTube often sends an array of entries; take the newest one
          if (Array.isArray(entry)) {
            entry = entry[0];
          }

          if (!entry) {
            // Check for deleted entry: <at:deleted-entry>
            const deletedEntry = jsonObj.feed?.["at:deleted-entry"];
            if (deletedEntry) {
              console.log(
                "[WebhookPing] Received deleted video notification:",
                deletedEntry,
              );
              return new Response(null, { status: 204 });
            }

            console.warn("[WebhookPing] No entry found in Atom Feed.");
            return new Response("No entry", { status: 200 });
          }

          // Extract videoId and channelId from entry
          const videoId = entry["yt:videoId"] || entry.id?.split(":").pop();
          let channelId =
            entry["yt:channelId"] || entry.author?.uri?.split("/").pop();

          // Fallback channelId from Link header if not in XML
          if (!channelId) {
            const linkHeader = request.headers.get("link");
            if (linkHeader) {
              const match = linkHeader.match(/<([^>]+)>\s*;\s*rel="self"/i);
              if (match?.[1]) {
                channelId = extractChannelIdFromTopic(match[1]);
              }
            }
          }

          // Ensure channelId starts with UC or HC
          if (
            channelId &&
            !channelId.startsWith("UC") &&
            !channelId.startsWith("HC")
          ) {
            channelId = `UC${channelId}`;
          }

          console.log(
            `[WebhookPing] Notification received - videoId: ${videoId}, channelId: ${channelId}`,
          );

          if (!channelId) {
            console.warn(
              "[WebhookPing] Could not extract channelId from payload.",
            );
            return new Response("Missing channelId", { status: 400 });
          }

          // Cryptographic HMAC Verification
          const channel = await db.query.youtubeChannels.findFirst({
            where: eq(youtubeChannels.channelId, channelId),
          });

          if (channel?.subscriptionSecret) {
            const signature =
              request.headers.get("x-hub-signature") ||
              request.headers.get("x-hub-signature-256");

            const isValid = verifyHubSignature(
              body,
              signature,
              channel.subscriptionSecret,
            );

            if (!isValid) {
              console.warn(
                `[WebhookPing] Signature verification failed for channel: ${channelId}`,
              );
              return new Response("Forbidden: Invalid Signature", {
                status: 403,
              });
            }

            console.log(
              `[WebhookPing] Signature verified successfully for channel: ${channelId}`,
            );
          }

          // Trigger video sync and subscriber notifications in background
          if (videoId) {
            syncVideoAndNotifySubscribers(videoId, channelId).catch((err) => {
              console.error(
                `[WebhookSync] Background sync failed for video ${videoId}:`,
                err,
              );
            });

            // Return standard WebSub 204 No Content
            return new Response(null, { status: 204 });
          }

          console.warn(
            "[WebhookPing] Could not extract videoId from entry:",
            entry,
          );
          return new Response("Invalid entry format", { status: 400 });
        } catch (error: unknown) {
          console.error("[WebhookPing] Error processing webhook ping:", error);
          return new Response("Invalid XML payload", { status: 400 });
        }
      },
    },
  },
});
