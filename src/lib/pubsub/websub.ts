import crypto from "node:crypto";

export interface WebSubRequestOptions {
  hubUrl: string;
  topicUrl: string;
  callbackUrl: string;
  mode: "subscribe" | "unsubscribe";
  secret?: string;
  leaseSeconds?: number;
}

export interface WebSubResponse {
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * Generates a cryptographically strong 32-byte hexadecimal secret
 * for authenticating WebSub / PubSubHubbub webhooks.
 */
export function generateSubscriptionSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Sends a subscription or unsubscription request to a WebSub hub (e.g. Google PubSubHubbub).
 */
export async function requestWebSubSubscription(
  options: WebSubRequestOptions,
): Promise<WebSubResponse> {
  const params = new URLSearchParams({
    "hub.callback": options.callbackUrl,
    "hub.mode": options.mode,
    "hub.topic": options.topicUrl,
    "hub.verify": "async",
  });

  if (options.secret) {
    params.set("hub.secret", options.secret);
  }

  if (options.leaseSeconds) {
    params.set("hub.lease_seconds", options.leaseSeconds.toString());
  }

  try {
    const response = await fetch(options.hubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    // WebSub specification: 202 Accepted or 204 No Content indicates success
    if (response.status === 202 || response.status === 204 || response.ok) {
      return { success: true, status: response.status };
    }

    const errorBody = await response.text();
    return {
      success: false,
      status: response.status,
      error: `Hub error (${response.status}): ${errorBody}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Network error connecting to hub: ${message}`,
    };
  }
}

/**
 * Verifies the X-Hub-Signature header against the raw body and channel secret.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifyHubSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2) {
    return false;
  }

  const [algo, signature] = parts;
  if (!algo || !signature) {
    return false;
  }

  try {
    const hmac = crypto.createHmac(algo.toLowerCase(), secret);
    hmac.update(rawBody);
    const computedDigest = hmac.digest("hex");

    const computedBuf = Buffer.from(computedDigest, "utf8");
    const signatureBuf = Buffer.from(signature, "utf8");

    if (computedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Extracts YouTube channel ID from a feed topic URL.
 * Example: https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw -> UC_x5XG1OV2P6uZZ5FSM9Ttw
 */
export function extractChannelIdFromTopic(topicUrl: string): string | null {
  try {
    const url = new URL(topicUrl);
    return url.searchParams.get("channel_id");
  } catch {
    return null;
  }
}
