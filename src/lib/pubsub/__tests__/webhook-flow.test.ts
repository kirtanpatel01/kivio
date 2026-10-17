import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { verifyHubSignature } from "../websub";

describe("Webhook End-to-End Processing Simulation", () => {
  const sampleAtomFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
  <link rel="self" href="https://www.youtube.com/xml/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw"/>
  <title>YouTube video feed</title>
  <updated>2026-10-17T05:30:00+00:00</updated>
  <entry>
    <id>yt:video:dQw4w9WgXcQ</id>
    <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    <yt:channelId>UC_x5XG1OV2P6uZZ5FSM9Ttw</yt:channelId>
    <title>Never Gonna Give You Up</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"/>
    <author>
      <name>Rick Astley</name>
      <uri>https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw</uri>
    </author>
    <published>2026-10-17T05:25:00+00:00</published>
    <updated>2026-10-17T05:30:00+00:00</updated>
  </entry>
</feed>`;

  it("should parse YouTube Atom XML and extract videoId and channelId correctly", () => {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(sampleAtomFeed);

    const entry = parsed.feed?.entry;
    expect(entry).toBeDefined();

    const videoId = entry["yt:videoId"] || entry.id?.split(":").pop();
    const channelId =
      entry["yt:channelId"] || entry.author?.uri?.split("/").pop();

    expect(videoId).toBe("dQw4w9WgXcQ");
    expect(channelId).toBe("UC_x5XG1OV2P6uZZ5FSM9Ttw");
  });

  it("should verify valid incoming X-Hub-Signature with matching secret", () => {
    const channelSecret =
      "c983a54b6f721d3e8a49c2017e849b2c34a1e958742d10398471625483920145";
    const hmac = crypto
      .createHmac("sha1", channelSecret)
      .update(sampleAtomFeed)
      .digest("hex");
    const signatureHeader = `sha1=${hmac}`;

    const isValid = verifyHubSignature(
      sampleAtomFeed,
      signatureHeader,
      channelSecret,
    );
    expect(isValid).toBe(true);
  });

  it("should reject incoming X-Hub-Signature when body has been modified", () => {
    const channelSecret =
      "c983a54b6f721d3e8a49c2017e849b2c34a1e958742d10398471625483920145";
    const hmac = crypto
      .createHmac("sha1", channelSecret)
      .update(sampleAtomFeed)
      .digest("hex");
    const signatureHeader = `sha1=${hmac}`;

    const tamperedFeed = sampleAtomFeed.replace(
      "dQw4w9WgXcQ",
      "fakeVideoId123",
    );
    const isValid = verifyHubSignature(
      tamperedFeed,
      signatureHeader,
      channelSecret,
    );
    expect(isValid).toBe(false);
  });

  it("should correctly handle deleted video notifications in Atom feed", () => {
    const deletedEntryFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:at="http://purl.org/atompub/tombstones/1.0" xmlns="http://www.w3.org/2005/Atom">
  <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
  <at:deleted-entry ref="yt:video:dQw4w9WgXcQ" when="2026-10-17T05:30:00+00:00">
    <link href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"/>
    <at:by>
      <name>Rick Astley</name>
      <uri>https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw</uri>
    </at:by>
  </at:deleted-entry>
</feed>`;

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(deletedEntryFeed);

    expect(parsed.feed?.["at:deleted-entry"]).toBeDefined();
    expect(parsed.feed?.entry).toBeUndefined();
  });
});
