import { createServerFn } from "@tanstack/react-start";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

function getEnvVar(key: string): string | undefined {
  // First check process.env (works in production / if set externally)
  if (process.env[key]) return process.env[key];

  // Fallback: parse .env file directly (reliable in dev)
  try {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed) continue;
      const [k, ...rest] = trimmed.split("=");
      if (k?.trim() === key) return rest.join("=").trim();
    }
  } catch {
    // .env file doesn't exist
  }
  return undefined;
}

export interface YouTubeChannelDetails {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  publishedAt: string;
  country?: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

export const fetchChannelByHandle = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const apiKey = getEnvVar("YOUTUBE_API_KEY");
    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY is not configured in your .env file.");
    }

    const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(cleanHandle)}&part=snippet,statistics,contentDetails&key=${apiKey}`,
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`YouTube API error (${res.status}): ${body}`);
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      throw new Error(`No channel found for handle "${cleanHandle}"`);
    }

    const item = data.items[0];

    const result: YouTubeChannelDetails = {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      customUrl: item.snippet.customUrl,
      publishedAt: item.snippet.publishedAt,
      country: item.snippet.country,
      thumbnails: item.snippet.thumbnails,
      statistics: {
        viewCount: item.statistics.viewCount,
        subscriberCount: item.statistics.subscriberCount,
        videoCount: item.statistics.videoCount,
      },
    };

    return result;
  });
