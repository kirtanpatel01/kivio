import { db } from "#/db";
import { youtubeChannels } from "#/db/schema";
import { eq } from "drizzle-orm";
import { getEnvVar } from "#/lib/server-utils";
import {
  generateSubscriptionSecret,
  requestWebSubSubscription,
} from "#/lib/pubsub/websub";

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

/**
 * Subscribes our webhook endpoint to a YouTube channel's pings.
 * Generates and stores a cryptographic HMAC secret if not already set.
 * This should be called whenever a channel is added to the system.
 */
export async function subscribeToChannelWebhooks(channelId: string) {
  // Public URL for the webhook (MUST be set in env for production, or ngrok for dev)
  const webhookBaseUrl = getEnvVar("WEBHOOK_URL") || "https://your-app.com";
  const callbackUrl = `${webhookBaseUrl.replace(/\/+$/, "")}/api/webhooks/youtube`;
  const topicUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  // 1. Fetch channel from DB to check for existing secret
  const channel = await db.query.youtubeChannels.findFirst({
    where: eq(youtubeChannels.channelId, channelId),
  });

  let secret = channel?.subscriptionSecret;
  if (!secret) {
    secret = generateSubscriptionSecret();
    if (channel) {
      await db
        .update(youtubeChannels)
        .set({ subscriptionSecret: secret })
        .where(eq(youtubeChannels.channelId, channelId));
    }
  }

  console.log(
    `[WebhookSub] Requesting subscription for ${channelId} to ${callbackUrl}...`,
  );

  const result = await requestWebSubSubscription({
    hubUrl: HUB_URL,
    topicUrl,
    callbackUrl,
    mode: "subscribe",
    secret,
  });

  if (!result.success) {
    console.error(
      `[WebhookSub] Google Hub subscription error for ${channelId}:`,
      result.error,
    );
    return { success: false, error: result.error };
  }

  console.log(
    `[WebhookSub] Subscription requested successfully for ${channelId}.`,
  );
  return { success: true };
}

/**
 * Unsubscribes our webhook endpoint from a YouTube channel's pings.
 */
export async function unsubscribeFromChannelWebhooks(channelId: string) {
  const webhookBaseUrl = getEnvVar("WEBHOOK_URL") || "https://your-app.com";
  const callbackUrl = `${webhookBaseUrl.replace(/\/+$/, "")}/api/webhooks/youtube`;
  const topicUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const channel = await db.query.youtubeChannels.findFirst({
    where: eq(youtubeChannels.channelId, channelId),
  });

  console.log(
    `[WebhookUnsub] Requesting unsubscription for ${channelId} from Google Hub...`,
  );

  const result = await requestWebSubSubscription({
    hubUrl: HUB_URL,
    topicUrl,
    callbackUrl,
    mode: "unsubscribe",
    secret: channel?.subscriptionSecret || undefined,
  });

  if (!result.success) {
    console.error(
      `[WebhookUnsub] Google Hub unsubscription error for ${channelId}:`,
      result.error,
    );
    return { success: false, error: result.error };
  }

  // Clear subscription lease in database
  if (channel) {
    await db
      .update(youtubeChannels)
      .set({ subscriptionLeaseExpiresAt: null })
      .where(eq(youtubeChannels.channelId, channelId));
  }

  console.log(
    `[WebhookUnsub] Unsubscription requested successfully for ${channelId}.`,
  );
  return { success: true };
}

/**
 * Re-subscribes all followed YouTube channels in the database.
 * Useful for updating secrets or renewing all leases.
 */
export async function resubscribeAllChannels() {
  const allChannels = await db.query.youtubeChannels.findMany();
  console.log(
    `[WebhookSub] Starting re-subscription for ${allChannels.length} channels...`,
  );

  const results = [];
  for (const ch of allChannels) {
    try {
      const res = await subscribeToChannelWebhooks(ch.channelId);
      results.push({ channelId: ch.channelId, handle: ch.handle, ...res });
    } catch (err: unknown) {
      results.push({
        channelId: ch.channelId,
        handle: ch.handle,
        success: false,
        error: String(err),
      });
    }
  }

  return results;
}
