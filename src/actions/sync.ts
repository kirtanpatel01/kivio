import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, videos, youtubeChannels } from "#/db/schema";
import { ensureSession } from "#/lib/auth.functions";
import { getEnvVar } from "#/lib/server-utils";
import { parseISO8601DurationToSeconds } from "#/lib/utils";

export interface SyncBoundedParams {
  channelId: string;
  uploadsPlaylistId: string;
  limit?: number;
  pageToken?: string;
}

export interface SyncBoundedResult {
  totalSynced: number;
  nextPageToken?: string;
}

/**
 * BOUNDED SYNC: Fetches a single page (up to `limit`, max 50) of videos for a channel.
 * Designed to execute cleanly within Cloudflare Workers serverless execution bounds (~300ms).
 */
export async function syncChannelVideosBoundedInternal({
  channelId,
  uploadsPlaylistId,
  limit = 50,
  pageToken,
}: SyncBoundedParams): Promise<SyncBoundedResult> {
  const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
  if (!apiKey) throw new Error("YouTube API Key not configured.");

  const maxResults = Math.min(Math.max(limit, 1), 50);

  let url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${encodeURIComponent(
    uploadsPlaylistId,
  )}&part=snippet,contentDetails&key=${apiKey}&maxResults=${maxResults}`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API error: ${await res.text()}`);
  }

  const payload = await res.json();
  const items = payload.items || [];
  if (items.length === 0) {
    // Reached the end of the playlist on YouTube — clear token in DB
    await db
      .update(youtubeChannels)
      .set({ nextPageToken: null })
      .where(eq(youtubeChannels.channelId, channelId));
    return { totalSynced: 0, nextPageToken: undefined };
  }

  // 2. Fetch Details (Duration, Views, Likes)
  const videoIds = items
    .map((item: any) => item.contentDetails?.videoId)
    .filter(Boolean)
    .join(",");

  let detailsMap = new Map<string, any>();
  if (videoIds) {
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=snippet,contentDetails,statistics&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (detailsRes.ok) {
      const detailsData = await detailsRes.json();
      detailsMap = new Map<string, any>(
        (detailsData.items || []).map((v: any) => [v.id, v]),
      );
    }
  }

  // 3. Prepare rows and Batch Upsert into DB
  type VideoRowInsert = {
    id: string;
    channelId: string;
    title: string;
    publishedAt: Date | null;
    thumbnail: string;
    duration: string | null;
    viewCount: string | null;
    rawPlaylistItem: any;
    rawVideo: any;
    durationSeconds: number | null;
    isShort: boolean | null;
  };

  const videoRowsWithNulls = items.map((item: any): VideoRowInsert | null => {
    const videoId = item.contentDetails?.videoId;
    if (!videoId) return null;
    const details = detailsMap.get(videoId);

    const durationIso: string | undefined = details?.contentDetails?.duration;
    const durationSeconds = durationIso
      ? parseISO8601DurationToSeconds(durationIso)
      : null;
    const isShort = durationSeconds !== null ? durationSeconds < 180 : null;

    const title = item.snippet?.title || details?.snippet?.title || videoId;
    const publishedAtStr =
      item.snippet?.publishedAt ||
      details?.snippet?.publishedAt ||
      item.contentDetails?.videoPublishedAt;
    const publishedAt = publishedAtStr ? new Date(publishedAtStr) : null;
    const thumbnail =
      item.snippet?.thumbnails?.maxres?.url ||
      item.snippet?.thumbnails?.standard?.url ||
      item.snippet?.thumbnails?.high?.url ||
      details?.snippet?.thumbnails?.maxres?.url ||
      details?.snippet?.thumbnails?.standard?.url ||
      details?.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      "";
    const duration = durationIso ?? null;
    const viewCount = details?.statistics?.viewCount ?? null;

    return {
      id: videoId,
      channelId,
      title,
      publishedAt,
      thumbnail,
      duration,
      viewCount,
      rawPlaylistItem: item,
      rawVideo: details ?? null,
      durationSeconds,
      isShort,
    };
  });

  const videoRows = videoRowsWithNulls.filter(
    (row: VideoRowInsert | null): row is VideoRowInsert => row !== null,
  );

  if (videoRows.length > 0) {
    await db
      .insert(videos)
      .values(videoRows)
      .onConflictDoUpdate({
        target: videos.id,
        set: {
          title: sql`excluded.title`,
          publishedAt: sql`excluded.published_at`,
          thumbnail: sql`excluded.thumbnail`,
          duration: sql`excluded.duration`,
          viewCount: sql`excluded.view_count`,
          rawPlaylistItem: sql`excluded.raw_playlist_item`,
          rawVideo: sql`excluded.raw_video`,
          durationSeconds: sql`excluded.duration_seconds`,
          isShort: sql`excluded.is_short`,
        },
      });
    // Persist pagination token to allow subsequent bounded batch syncing
    await db
      .update(youtubeChannels)
      .set({
        nextPageToken: payload.nextPageToken ?? null,
      })
      .where(eq(youtubeChannels.channelId, channelId));
  } else {
    // If all items were filtered out (e.g. private/deleted videos), still update token or clear it
    await db
      .update(youtubeChannels)
      .set({
        nextPageToken: payload.nextPageToken ?? null,
      })
      .where(eq(youtubeChannels.channelId, channelId));
  }

  console.log(
    `[BoundedSync] Synced ${videoRows.length} videos for channel ${channelId}. Next page token: ${payload.nextPageToken || "none"}`,
  );

  return {
    totalSynced: videoRows.length,
    nextPageToken: payload.nextPageToken,
  };
}

export const syncChannelVideosBounded = createServerFn({ method: "POST" })
  .validator(
    (data: {
      channelId: string;
      uploadsPlaylistId: string;
      limit?: number;
      pageToken?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return syncChannelVideosBoundedInternal(data);
  });

export const syncAllSubscribedChannels = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await ensureSession();
  const userId = session.user.id;
  if (!userId) throw new Error("Unauthorized");

  const userChannels = await db.query.channels.findMany({
    where: eq(channels.userId, userId),
    with: { youtubeChannel: true },
  });

  for (const uc of userChannels) {
    if (uc.youtubeChannel) {
      await syncChannelVideosBoundedInternal({
        channelId: uc.youtubeChannel.channelId,
        uploadsPlaylistId: uc.youtubeChannel.uploadsPlaylistId,
        limit: 50,
      });
    }
  }
  return { success: true };
});
