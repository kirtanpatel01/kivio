import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  extractChannelIdFromTopic,
  generateSubscriptionSecret,
  verifyHubSignature,
} from "../websub";

describe("WebSub Utilities", () => {
  it("should generate a 64-character (32-byte) hex secret", () => {
    const secret = generateSubscriptionSecret();
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
    const secret2 = generateSubscriptionSecret();
    expect(secret).not.toBe(secret2);
  });

  it("should extract channel_id from a YouTube feed topic URL", () => {
    const topic =
      "https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw";
    expect(extractChannelIdFromTopic(topic)).toBe("UC_x5XG1OV2P6uZZ5FSM9Ttw");
  });

  it("should return null for invalid or missing channel_id in topic URL", () => {
    expect(extractChannelIdFromTopic("https://example.com/rss")).toBeNull();
    expect(extractChannelIdFromTopic("not-a-url")).toBeNull();
  });

  it("should correctly verify valid sha1 HMAC signatures", () => {
    const secret = "test-secret-123";
    const body = "<feed><entry><title>Test Video</title></entry></feed>";
    const hmac = crypto.createHmac("sha1", secret).update(body).digest("hex");
    const signatureHeader = `sha1=${hmac}`;

    expect(verifyHubSignature(body, signatureHeader, secret)).toBe(true);
  });

  it("should correctly verify valid sha256 HMAC signatures", () => {
    const secret = "test-secret-123";
    const body = "<feed><entry><title>Test Video</title></entry></feed>";
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const signatureHeader = `sha256=${hmac}`;

    expect(verifyHubSignature(body, signatureHeader, secret)).toBe(true);
  });

  it("should reject tampered body or mismatched secret", () => {
    const secret = "test-secret-123";
    const body = "<feed><entry><title>Test Video</title></entry></feed>";
    const hmac = crypto.createHmac("sha1", secret).update(body).digest("hex");
    const signatureHeader = `sha1=${hmac}`;

    // Tampered body
    expect(
      verifyHubSignature(body + "tampered", signatureHeader, secret),
    ).toBe(false);

    // Wrong secret
    expect(
      verifyHubSignature(body, signatureHeader, "wrong-secret"),
    ).toBe(false);

    // Malformed header
    expect(verifyHubSignature(body, "invalid-header", secret)).toBe(false);
    expect(verifyHubSignature(body, null, secret)).toBe(false);
  });
});
