import { db } from "#/db";
import { videos, notifications, channels, youtubeChannels } from "#/db/schema";
import { eq } from "drizzle-orm";
import { getEnvVar } from "#/lib/server-utils";
import { parseISO8601DurationToSeconds } from "#/lib/utils";

/**
 * Syncs a single video by ID and notifies all users who follow its channel.
 * This is called by the webhook POST handler.
 */
export async function syncVideoAndNotifySubscribers(
  videoId: string,
  channelId: string,
) {
  const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
  if (!apiKey) throw new Error("YouTube API Key not configured.");

  try {
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok)
      throw new Error(`YouTube API error: ${await detailsRes.text()}`);

    const detailsData = await detailsRes.json();
    const item = detailsData.items?.[0];
    if (!item) {
      return;
    }

    const durationIso: string | undefined = item?.contentDetails?.duration;
    const durationSeconds = durationIso
      ? parseISO8601DurationToSeconds(durationIso)
      : null;
    const isShort = durationSeconds !== null ? durationSeconds < 180 : null;

    await db
      .insert(videos)
      .values({
        id: videoId,
        channelId,
        rawVideo: item,
        durationSeconds,
        isShort,
      })
      .onConflictDoUpdate({
        target: videos.id,
        set: {
          rawVideo: item,
          durationSeconds,
          isShort,
        },
      });

    const yc = await db.query.youtubeChannels.findFirst({
      where: eq(youtubeChannels.channelId, channelId),
    });

    if (!yc) {
      return;
    }

    const userSubscriptions = await db.query.channels.findMany({
      where: eq(channels.handle, yc.handle),
    });

    if (userSubscriptions.length === 0) return;

    const notificationRows = userSubscriptions.map((sub) => ({
      userId: sub.userId,
      videoId: videoId,
      title: item.snippet.title,
      channelTitle: yc.title,
      channelAvatar: yc.thumbnailMedium,
      thumbnail:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.default?.url ||
        "",
      type: "video_upload",
    }));

    await db.insert(notifications).values(notificationRows);
  } catch (error) {
    console.error(`[WebhookSync] Error for video ${videoId}:`, error);
    throw error;
  }
}
