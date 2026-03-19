import { createServerFn } from "@tanstack/react-start";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { youtubeChannels } from "#/db/schema";

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

// Cache TTL: 24 hours — channel data doesn't change that frequently
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const fetchChannelByHandle = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const cleanHandle = (
      handle.startsWith("@") ? handle : `@${handle}`
    ).toLowerCase();

    // 1. Check database cache first
    const cached = await db.query.youtubeChannels.findFirst({
      where: eq(youtubeChannels.handle, cleanHandle),
    });

    if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
      console.log(`[db cache hit] Returning cached data for ${cleanHandle}`);
      const result: YouTubeChannelDetails = {
        id: cached.channelId,
        title: cached.title,
        description: cached.description,
        customUrl: cached.customUrl,
        publishedAt: cached.publishedAt,
        country: cached.country ?? undefined,
        thumbnails: {
          default: { url: cached.thumbnailDefault },
          medium: { url: cached.thumbnailMedium },
          high: { url: cached.thumbnailHigh },
        },
        statistics: {
          viewCount: cached.viewCount,
          subscriberCount: cached.subscriberCount,
          videoCount: cached.videoCount,
        },
      };
      return result;
    }

    // 2. Cache miss or expired — fetch from YouTube API
    const apiKey = getEnvVar("YOUTUBE_API_KEY");
    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY is not configured in your .env file.");
    }

    console.log(`[db cache miss] Fetching from YouTube API for ${cleanHandle}`);

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

    // 3. Upsert into database cache (insert or update if handle already exists)
    const row = {
      handle: cleanHandle,
      channelId: result.id,
      title: result.title,
      description: result.description,
      customUrl: result.customUrl,
      publishedAt: result.publishedAt,
      country: result.country ?? null,
      thumbnailDefault: result.thumbnails.default.url,
      thumbnailMedium: result.thumbnails.medium.url,
      thumbnailHigh: result.thumbnails.high.url,
      viewCount: result.statistics.viewCount,
      subscriberCount: result.statistics.subscriberCount,
      videoCount: result.statistics.videoCount,
      fetchedAt: new Date(),
    };

    await db
      .insert(youtubeChannels)
      .values(row)
      .onConflictDoUpdate({
        target: youtubeChannels.handle,
        set: { ...row, handle: undefined },
      });

    return result;
  });

