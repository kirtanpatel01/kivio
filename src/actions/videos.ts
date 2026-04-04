import { createServerFn } from "@tanstack/react-start";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { videos } from "#/db/schema";
import { getEnvVar } from "#/lib/server-utils";
import { parseISO8601Duration } from "#/lib/utils";
import type { YouTubeVideo } from "#/types";

export function mapDbVideoToYouTubeVideo(
  v: any,
  channelInfo?: { title: string; thumbnailMedium: string },
): YouTubeVideo | null {
  if (!v) return null;

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

  // 5. Extract Thumbnail
  const thumb =
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
    channelAvatar:
      channelInfo?.thumbnailMedium ?? v.youtubeChannel?.thumbnailMedium ?? "",
    uploadsPlaylistId: (v.youtubeChannel as any)?.uploadsPlaylistId,
    isShort: v.isShort ?? false,
  } as YouTubeVideo;
}

export const getSuggestedVideos = createServerFn({ method: "GET" })
  .inputValidator((data: { channelId: string }) => data)
  .handler(async ({ data }) => {
    const { channelId } = data;

    const result = await db.query.videos.findMany({
      where: eq(videos.channelId, channelId),
      with: {
        youtubeChannel: true,
      },
      orderBy: [
        desc(
          sql`(${videos.rawVideo} -> 'snippet' ->> 'publishedAt')::timestamptz`,
        ),
      ],
      limit: 12,
    });

    return result
      .map((v) => mapDbVideoToYouTubeVideo(v))
      .filter((v): v is YouTubeVideo => v !== null);
  });

export const fetchVideoDetails = createServerFn({ method: "GET" })
  .inputValidator((videoId: string) => videoId)
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
