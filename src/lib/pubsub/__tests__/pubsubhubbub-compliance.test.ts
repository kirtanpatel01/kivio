import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import {
  verifyHubSignature,
  extractChannelIdFromTopic,
} from "../websub";
import {
  notificationEvents,
  NOTIFICATION_EVENT,
} from "../../notification-events";

describe("PubSubHubbub (WebSub) Compliance Tests (adapted from node-pubsubhubbub)", () => {
  const channelId = "UC_x5XG1OV2P6uZZ5FSM9Ttw";
  const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
  const channelSecret = "c983a54b6f721d3e8a49c2017e849b2c34a1e958742d10398471625483920145";

  const sampleAtomFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
  <link rel="self" href="${topicUrl}"/>
  <title>YouTube video feed</title>
  <entry>
    <id>yt:video:dQw4w9WgXcQ</id>
    <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    <yt:channelId>${channelId}</yt:channelId>
    <title>Never Gonna Give You Up</title>
  </entry>
</feed>`;

  // Equivalent to node-pubsubhubbub: compute HMAC signature for feed body
  function computeHubSignature(body: string, secret: string) {
    const hmac = crypto.createHmac("sha1", secret).update(body).digest("hex");
    return `sha1=${hmac}`;
  }

  it("should extract channel ID correctly from topic URL", () => {
    const extracted = extractChannelIdFromTopic(topicUrl);
    expect(extracted).toBe(channelId);
  });

  it("should verify valid X-Hub-Signature header (successful request)", () => {
    const signature = computeHubSignature(sampleAtomFeed, channelSecret);
    const isValid = verifyHubSignature(sampleAtomFeed, signature, channelSecret);
    expect(isValid).toBe(true);
  });

  it("should reject when X-Hub-Signature header is missing (403 forbidden condition)", () => {
    const isValid = verifyHubSignature(sampleAtomFeed, null, channelSecret);
    expect(isValid).toBe(false);
  });

  it("should reject when signature does not match (tampered content)", () => {
    const signature = computeHubSignature(sampleAtomFeed, channelSecret);
    const tamperedBody = sampleAtomFeed + "<!-- malicious modification -->";
    const isValid = verifyHubSignature(tamperedBody, signature, channelSecret);
    expect(isValid).toBe(false);
  });

  it("should parse Atom XML entry and extract videoId and channelId correctly", () => {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(sampleAtomFeed);
    const entry = parsed.feed?.entry;

    expect(entry).toBeDefined();
    expect(entry["yt:videoId"]).toBe("dQw4w9WgXcQ");
    expect(entry["yt:channelId"]).toBe(channelId);
  });

  it("should emit and receive real-time notification events across subscribers", async () => {
    const testUserId = "user_test_subscriber_123";
    let eventReceived = false;
    let receivedPayload: any = null;

    const listener = (data: { userId: string }) => {
      if (data.userId === testUserId) {
        eventReceived = true;
        receivedPayload = data;
      }
    };

    notificationEvents.on(NOTIFICATION_EVENT, listener);

    // Emit event as sync-notify does
    notificationEvents.emit(NOTIFICATION_EVENT, { userId: testUserId });

    expect(eventReceived).toBe(true);
    expect(receivedPayload).toEqual({ userId: testUserId });

    notificationEvents.off(NOTIFICATION_EVENT, listener);
  });
});
