import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { channels, youtubeChannels } from "#/db/schema";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { type YouTubeChannelDetails } from "#/lib/youtube";
import { ensureSession } from "#/lib/auth.functions";

function getEnvVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
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

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const fetchChannelByHandle = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    if (!handle || handle.trim() === "" || handle.trim() === "@") {
      return null;
    }

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
        uploadsPlaylistId: cached.uploadsPlaylistId,
      };
      return result;
    }

    // 2. Cache miss or expired — fetch from YouTube API
    const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
    if (!apiKey) {
      console.error("[YouTube API] YOUTUBE_API_KEY is missing or empty");
      throw new Error("YouTube API Key is not configured.");
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(cleanHandle)}&part=snippet,statistics,contentDetails&key=${apiKey}`;

    console.log(
      `[YouTube API] Fetching from ${url.replace(apiKey, "REDACTED")}`,
    );

    try {
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.text();
        console.error(
          `[YouTube API] Request failed with status ${res.status}:`,
          body,
        );

        if (res.status === 400) {
          // If the handle is invalid or not found, return null to show empty state/clean error
          return null;
        }
        throw new Error(`YouTube API error (${res.status}): ${body}`);
      }

      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        console.log(`[YouTube API] No items found for ${cleanHandle}`);
        return null;
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
        uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
      };

      // 3. Upsert into database cache
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
        uploadsPlaylistId: result.uploadsPlaylistId,
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
    } catch (e: any) {
      console.error("[YouTube API] Unexpected error:", e);
      throw e;
    }
  });

export const fetchVideosByPlaylistId = createServerFn({ method: "GET" })
  .inputValidator((data: { playlistId: string; pageToken?: string }) => data)
  .handler(async ({ data }) => {
    const { playlistId, pageToken } = data;
    const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
    if (!apiKey) {
      console.error("[YouTube API] YOUTUBE_API_KEY is missing or empty");
      throw new Error("YouTube API Key is not configured.");
    }

    let url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${encodeURIComponent(playlistId)}&part=snippet,contentDetails&key=${apiKey}&maxResults=10`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    console.log(
      `[YouTube API] Fetching from ${url.replace(apiKey, "REDACTED")}`,
    );

    try {
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.text();
        console.error(
          `[YouTube API] Request failed with status ${res.status}:`,
          body,
        );

        if (res.status === 400) {
          // If the playlistId is invalid or not found, return null to show empty state/clean error
          return null;
        }
        throw new Error(`YouTube API error (${res.status}): ${body}`);
      }

      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        console.log(`[YouTube API] No items found for ${playlistId}`);
        return { videos: [], nextPageToken: null };
      }

      const videos = data.items.map((item: any) => ({
        id: item.contentDetails.videoId, // The official Video ID
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
      }));

      return { videos, nextPageToken: data.nextPageToken || null };
    } catch (e: any) {
      console.error("[YouTube API] Unexpected error:", e);
      throw e;
    }
  });

export const fetchFeedForUser = createServerFn({
  method: "GET",
})
  .inputValidator((tokens?: Record<string, string>) => tokens)
  .handler(async ({ data: tokens }) => {
    const session = await ensureSession();
    const userId = session.user.id;
    if (!userId) throw new Error("Unauthorized");

    const userChannels = await db.query.channels.findMany({
      where: eq(channels.userId, userId),
      with: {
        youtubeChannel: true,
      },
    });

    if (userChannels.length === 0) return { videos: [], nextPageTokens: {} };

    const allResultsPromises = userChannels.map(async (uc) => {
      const playlistId = uc.youtubeChannel?.uploadsPlaylistId;
      if (!playlistId) return { videos: [], nextPageToken: null, channelId: uc.handle };

      const pageToken = tokens?.[playlistId];
      
      // Fetch the videos
      const result = await fetchVideosByPlaylistId({ data: { playlistId, pageToken } });
      
      if (!result || !result.videos) return { videos: [], nextPageToken: null, channelId: uc.handle };
      
      const videosWithAvatar = result.videos.map((v: any) => ({
        ...v,
        channelAvatar: uc.youtubeChannel?.thumbnailMedium
      }));

      return { 
        videos: videosWithAvatar, 
        nextPageToken: result.nextPageToken,
        playlistId 
      };
    });

    const resultsByChannel = await Promise.all(allResultsPromises);

    const allVideos = resultsByChannel
      .map(r => r.videos)
      .flat()
      .sort((a: any, b: any) => {
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });

    const nextPageTokens: Record<string, string> = {};
    resultsByChannel.forEach(r => {
      if (r.playlistId && r.nextPageToken) {
        nextPageTokens[r.playlistId] = r.nextPageToken;
      }
    });

    return { videos: allVideos, nextPageTokens };
  });
