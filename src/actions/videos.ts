import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";
import { db } from "#/db";
import { getEnvVar } from "#/lib/server-utils";
import { parseISO8601Duration } from "#/lib/utils";
import type { YouTubeVideo } from "#/types";

export function mapDbVideoToYouTubeVideo(
  v: any,
  channelInfo?: {
    title: string;
    thumbnailMedium: string;
    handle?: string;
    customUrl?: string;
  },
): YouTubeVideo | null {
  if (!v) return null;

  // 0. Fast path: if video already has lightweight projected fields from SQL
  if (v.title && v.thumbnail !== undefined && (v.publishedAt || v.createdAt)) {
    const duration = v.rawDuration
      ? parseISO8601Duration(v.rawDuration)
      : typeof v.durationSeconds === "number"
        ? `${Math.floor(v.durationSeconds / 60)}:${(v.durationSeconds % 60).toString().padStart(2, "0")}`
        : null;

    return {
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail,
      publishedAt: (v.publishedAt ?? v.createdAt) as string,
      duration,
      description: v.description,
      viewCount: v.viewCount ? String(v.viewCount) : undefined,
      likeCount: v.likeCount ? String(v.likeCount) : undefined,
      channelId: v.channelId,
      channelTitle: channelInfo?.title ?? v.channelTitle ?? v.youtubeChannel?.title ?? "",
      channelHandle:
        channelInfo?.handle ??
        v.channelHandle ??
        v.youtubeChannel?.handle ??
        channelInfo?.customUrl ??
        v.youtubeChannel?.customUrl ??
        undefined,
      channelAvatar:
        channelInfo?.thumbnailMedium ?? v.channelAvatar ?? v.youtubeChannel?.thumbnailMedium ?? "",
      uploadsPlaylistId: v.uploadsPlaylistId ?? v.youtubeChannel?.uploadsPlaylistId,
      isShort: v.isShort ?? false,
    } as YouTubeVideo;
  }

  // 1. Ensure we have objects, not strings (defensive against driver quirks)
  const rawVideo =
    typeof v.rawVideo === "string" ? JSON.parse(v.rawVideo) : v.rawVideo;
  const rawPlaylistItem =
    typeof v.rawPlaylistItem === "string"
      ? JSON.parse(v.rawPlaylistItem)
      : v.rawPlaylistItem;

  // 2. Identify snippets (check both paths)
  const rawSnippet = rawVideo?.snippet ?? null;
  const plSnippet = rawPlaylistItem?.snippet ?? null;

  // 3. Extract Published Date (Crucial for 56 years ago bug)
  const publishedAt =
    rawSnippet?.publishedAt ??
    rawPlaylistItem?.contentDetails?.videoPublishedAt ??
    plSnippet?.publishedAt ??
    v.createdAt?.toISOString();

  if (!publishedAt) return null;

  // 4. Extract Title (Crucial for untitled bug)
  const title = rawSnippet?.title ?? plSnippet?.title ?? v.id;

  // 5. Extract Thumbnail (Prioritize Full HD maxres, then standard, then high)
  const thumb =
    rawSnippet?.thumbnails?.maxres?.url ??
    plSnippet?.thumbnails?.maxres?.url ??
    rawSnippet?.thumbnails?.standard?.url ??
    plSnippet?.thumbnails?.standard?.url ??
    rawSnippet?.thumbnails?.high?.url ??
    plSnippet?.thumbnails?.high?.url ??
    rawSnippet?.thumbnails?.medium?.url ??
    plSnippet?.thumbnails?.medium?.url ??
    rawSnippet?.thumbnails?.default?.url ??
    plSnippet?.thumbnails?.default?.url ??
    "";

  // 6. Extract Statistics and Details
  const rawContentDetails = rawVideo?.contentDetails ?? null;
  const rawStatistics = rawVideo?.statistics ?? null;

  return {
    id: v.id,
    title,
    thumbnail: thumb,
    publishedAt: publishedAt as string,
    duration: rawContentDetails?.duration
      ? parseISO8601Duration(rawContentDetails.duration)
      : null,
    description: rawSnippet?.description ?? plSnippet?.description ?? undefined,
    viewCount: rawStatistics?.viewCount ?? undefined,
    likeCount: rawStatistics?.likeCount ?? undefined,
    channelId: v.channelId,
    channelTitle: channelInfo?.title ?? v.youtubeChannel?.title ?? "",
    channelHandle: v.channelHandle ?? v.youtubeChannel?.handle ?? undefined,
    channelAvatar:
      channelInfo?.thumbnailMedium ?? v.youtubeChannel?.thumbnailMedium ?? "",
    uploadsPlaylistId: (v.youtubeChannel as any)?.uploadsPlaylistId,
    isShort: v.isShort ?? false,
  } as YouTubeVideo;
}

export const getSuggestedVideos = createServerFn({ method: "GET" })
  .validator((data: { channelId: string }) => data)
  .handler(async ({ data }) => {
    const { channelId } = data;

    const result = await db.execute(sql`
      SELECT 
        v."id",
        v."channel_id" as "channelId",
        v."duration_seconds" as "durationSeconds",
        v."is_short" as "isShort",
        coalesce(v."raw_video" -> 'snippet' ->> 'title', v."raw_playlist_item" -> 'snippet' ->> 'title', v."id") as "title",
        coalesce(v."raw_video" -> 'snippet' ->> 'publishedAt', v."raw_playlist_item" -> 'contentDetails' ->> 'videoPublishedAt') as "publishedAt",
        coalesce(
          v."raw_video" -> 'snippet' -> 'thumbnails' -> 'maxres' ->> 'url',
          v."raw_video" -> 'snippet' -> 'thumbnails' -> 'standard' ->> 'url',
          v."raw_video" -> 'snippet' -> 'thumbnails' -> 'high' ->> 'url',
          v."raw_video" -> 'snippet' -> 'thumbnails' -> 'medium' ->> 'url',
          v."raw_playlist_item" -> 'snippet' -> 'thumbnails' -> 'maxres' ->> 'url',
          v."raw_playlist_item" -> 'snippet' -> 'thumbnails' -> 'standard' ->> 'url',
          v."raw_playlist_item" -> 'snippet' -> 'thumbnails' -> 'high' ->> 'url',
          ''
        ) as "thumbnail",
        v."raw_video" -> 'contentDetails' ->> 'duration' as "rawDuration",
        v."raw_video" -> 'statistics' ->> 'viewCount' as "viewCount"
      FROM "videos" v
      WHERE v."channel_id" = ${channelId}
      ORDER BY (v."raw_video" -> 'snippet' ->> 'publishedAt') DESC
      LIMIT 12;
    `);

    return (result.rows as any[])
      .map((v) => mapDbVideoToYouTubeVideo(v))
      .filter((v): v is YouTubeVideo => v !== null);
  });

export const fetchVideoDetails = createServerFn({ method: "GET" })
  .validator((videoId: string) => videoId)
  .handler(async ({ data: videoId }): Promise<YouTubeVideo | null> => {
    const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
    if (!apiKey) throw new Error("YouTube API Key not configured.");

    const url = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}&part=snippet,statistics,contentDetails&key=${apiKey}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.items || data.items.length === 0) return null;

      const item = data.items[0];
      const channelId = item.snippet.channelId;

      // Get channel details for avatar
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=snippet,statistics,contentDetails&key=${apiKey}`;
      const channelRes = await fetch(channelUrl);
      const channelData = await channelRes.json();
      const channelItem = channelData.items?.[0];

      return {
        id: item.id,
        title: item.snippet.title,
        thumbnail: (
          item.snippet.thumbnails.high || item.snippet.thumbnails.default
        ).url,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        viewCount: item.statistics.viewCount,
        likeCount: item.statistics.likeCount,
        duration: item.contentDetails.duration
          ? parseISO8601Duration(item.contentDetails.duration)
          : null,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        channelAvatar: channelItem?.snippet.thumbnails.medium.url,
        subscriberCount: channelItem?.statistics.subscriberCount,
        uploadsPlaylistId:
          channelItem?.contentDetails?.relatedPlaylists?.uploads,
      };
    } catch (e: unknown) {
      console.error("[YouTube API] fetchVideoDetails error:", e);
      throw e;
    }
  });
