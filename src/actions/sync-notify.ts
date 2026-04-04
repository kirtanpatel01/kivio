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

  console.log(
    `[WebhookSync] Processing video ${videoId} for channel ${channelId}...`,
  );

  try {
    // 1. Fetch Video Details from YouTube
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${apiKey}`;
    console.log("[WebhookSync] detailsUrl: ", detailsUrl);
    const detailsRes = await fetch(detailsUrl);
    console.log("[WebhookSync] detailsRes: ", detailsRes);
    if (!detailsRes.ok)
      throw new Error(`YouTube API error: ${await detailsRes.text()}`);

    const detailsData = await detailsRes.json();
    console.log("[WebhookSync] detailsData: ", detailsData);
    const item = detailsData.items?.[0];
    console.log("[WebhookSync] item: ", item);
    if (!item) {
      console.warn(
        `[WebhookSync] Video ${videoId} not found in API. It might be private or deleted.`,
      );
      return;
    }

    // 2. Prepare Video Metadata
    const durationIso: string | undefined = item?.contentDetails?.duration;
    console.log("[WebhookSync] durationIso: ", durationIso);
    const durationSeconds = durationIso
      ? parseISO8601DurationToSeconds(durationIso)
      : null;
    console.log("[WebhookSync] durationSeconds: ", durationSeconds);
    const isShort = durationSeconds !== null ? durationSeconds < 180 : null;
    console.log("[WebhookSync] isShort: ", isShort);

    // 3. Upsert to videos table
    const video = await db
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
    console.log("[WebhookSync] videos table upserted: ", video);

    // 4. Find all users following this channel
    // Actually, our 'channels' table has 'handle' which references 'youtubeChannels.handle'.
    // We should find the youtubeChannel by channelId first.
    const yc = await db.query.youtubeChannels.findFirst({
      where: eq(youtubeChannels.channelId, channelId),
    });

    console.log("[WebhookSync] yc: ", yc);

    if (!yc) {
      console.warn(
        `[WebhookSync] Channel ${channelId} not found in our database. Skipping notifications.`,
      );
      return;
    }

    const userSubscriptions = await db.query.channels.findMany({
      where: eq(channels.handle, yc.handle),
    });

    console.log("[WebhookSync] userSubscriptions: ", userSubscriptions);

    if (userSubscriptions.length === 0) return;

    // 5. Create notifications for all followers
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

    const notificationsResult = await db.insert(notifications).values(notificationRows);
    console.log("[WebhookSync] notifications table upserted: ", notificationsResult);

    console.log(
      `[WebhookSync] Successfully synced video and created ${notificationRows.length} notifications.`,
    );
  } catch (error) {
    console.error(`[WebhookSync] Error for video ${videoId}:`, error);
    throw error;
  }
}
