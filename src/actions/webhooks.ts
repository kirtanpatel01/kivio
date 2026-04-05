import { getEnvVar } from "#/lib/server-utils";

/**
 * Subscribes our webhook endpoint to a YouTube channel's pings.
 * This should be called whenever a channel is added to the system.
 */
export async function subscribeToChannelWebhooks(channelId: string) {
  const hubUrl = "https://pubsubhubbub.appspot.com/subscribe";

  // Public URL for the webhook (MUST be set in env for production, or ngrok for dev)
  const webhookBaseUrl = getEnvVar("WEBHOOK_URL") || "https://your-app.com";
  console.log(webhookBaseUrl)
  const callbackUrl = `${webhookBaseUrl}/api/webhooks/youtube`;
  const topicUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const params = new URLSearchParams({
    "hub.callback": callbackUrl,
    "hub.mode": "subscribe",
    "hub.topic": topicUrl,
    "hub.verify": "async",
  });

  console.log(
    `[WebhookSub] Requesting subscription for ${channelId} to ${callbackUrl}...`,
  );

  try {
    const response = await fetch(hubUrl, {
      method: "POST",
      body: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[WebhookSub] Google Hub error for ${channelId}:`,
        errorText,
      );
      return { success: false, error: errorText };
    }

    console.log(
      `[WebhookSub] Subscription requested successfully for ${channelId}.`,
    );
    return { success: true };
  } catch (error) {
    console.error(`[WebhookSub] network error for ${channelId}:`, error);
    return { success: false, error };
  }
}
