import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, youtubeChannels } from "#/db/schema";
import { getSession, ensureSession } from "#/lib/auth.functions";
import { normalizeHandle } from "#/lib/utils";
import { fetchChannelByHandle } from "./channel";
import { mapDbVideoToYouTubeVideo } from "./videos";
import type { YouTubeVideo } from "#/types";

export const getUserChannels = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const session = await getSession();
      const userId = session?.user?.id;
      if (!userId) {
        return [];
      }

      const userChannels = await db.query.channels.findMany({
        where: eq(channels.userId, userId),
        with: {
          youtubeChannel: true,
        },
      });

      // Sort by channel title alphabetically
      return userChannels.sort((a, b) =>
        (a.youtubeChannel?.title ?? "").localeCompare(
          b.youtubeChannel?.title ?? "",
        ),
      );
    } catch (err: unknown) {
      console.error("[Channels Action] getUserChannels error:", err);
      throw err;
    }
  },
);

import {
  subscribeToChannelWebhooks,
  unsubscribeFromChannelWebhooks,
} from "./webhooks";

export const addUserChannel = createServerFn({ method: "POST" })
  .validator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      // This function handles fetching from YouTube and caching the metadata automatically
      const details = await fetchChannelByHandle({ data: handle });
      if (!details) throw new Error("Channel not found");

      // Link the user to the channel handle
      const [newChannel] = await db
        .insert(channels)
        .values({
          userId,
          handle: normalizeHandle(handle),
        })
        .onConflictDoNothing() // Avoid double follow
        .returning();

      // Trigger real-time notifications via Webhooks
      if (details.id) {
        subscribeToChannelWebhooks(details.id).catch((err) =>
          console.error(`[WebhookSync] Failed for ${details.id}:`, err),
        );
      }

      return newChannel;
    } catch (err: unknown) {
      console.error("[Channels Action] addUserChannel error:", err);
      throw err;
    }
  });

export const removeUserChannel = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      // 1. Find the channel record to determine the handle
      const userChannel = await db.query.channels.findFirst({
        where: and(eq(channels.id, id), eq(channels.userId, userId)),
      });

      if (!userChannel) {
        return { success: false, error: "Channel not found" };
      }

      // 2. Delete the user follow record
      await db
        .delete(channels)
        .where(and(eq(channels.id, id), eq(channels.userId, userId)));

      // 3. Check if any other user is still following this channel
      const remainingFollower = await db.query.channels.findFirst({
        where: eq(channels.handle, userChannel.handle),
      });

      // 4. If no one else follows this channel, unsubscribe from Google Hub
      if (!remainingFollower) {
        const yc = await db.query.youtubeChannels.findFirst({
          where: eq(youtubeChannels.handle, userChannel.handle),
        });

        if (yc?.channelId) {
          unsubscribeFromChannelWebhooks(yc.channelId).catch((err) =>
            console.error(
              `[WebhookUnsub] Error unsubscribing ${yc.channelId}:`,
              err,
            ),
          );
        }
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("[Channels Action] removeUserChannel error:", err);
      throw err;
    }
  });

/** Videos stored for a channel, scoped to channels the signed-in user follows. */
export const getVideosForChannelHandle = createServerFn({ method: "GET" })
  .validator((input: string | { handle: string; isShort?: boolean }) => input)
  .handler(async ({ data: input }) => {
    const handle = typeof input === "string" ? input : input.handle;
    const isShort = typeof input === "object" ? input.isShort : undefined;

    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) return [];

    const cleanHandle = normalizeHandle(handle);
    if (!cleanHandle) return [];

    const isFollowing = await db.query.channels.findFirst({
      where: and(
        eq(channels.userId, userId),
        sql`lower(${channels.handle}) = ${cleanHandle}`,
      ),
    });
    if (!isFollowing) return [];

    const yc = await db.query.youtubeChannels.findFirst({
      where: eq(youtubeChannels.handle, cleanHandle),
    });
    if (!yc) return [];

    const shortFilter =
      isShort === true
        ? sql`AND v."is_short" IS TRUE`
        : isShort === false
          ? sql`AND (v."is_short" IS NOT TRUE OR v."is_short" IS NULL)`
          : sql``;

    const result = await db.execute(sql`
      SELECT 
        v."id",
        v."channel_id" as "channelId",
        v."duration_seconds" as "durationSeconds",
        v."is_short" as "isShort",
        coalesce(v."raw_video" -> 'snippet' ->> 'title', v."raw_playlist_item" -> 'snippet' ->> 'title', v."id") as "title",
        coalesce(v."raw_video" -> 'snippet' ->> 'publishedAt', v."raw_playlist_item" -> 'contentDetails' ->> 'videoPublishedAt') as "publishedAt",
        coalesce(
          v."raw_video" -> 'snippet' -> 'thumbnails' -> 'high' ->> 'url',
          v."raw_video" -> 'snippet' -> 'thumbnails' -> 'medium' ->> 'url',
          v."raw_playlist_item" -> 'snippet' -> 'thumbnails' -> 'high' ->> 'url',
          ''
        ) as "thumbnail",
        v."raw_video" -> 'contentDetails' ->> 'duration' as "rawDuration",
        v."raw_video" -> 'statistics' ->> 'viewCount' as "viewCount"
      FROM "videos" v
      WHERE v."channel_id" = ${yc.channelId}
      ${shortFilter}
      ORDER BY (v."raw_video" -> 'snippet' ->> 'publishedAt') DESC
      LIMIT 36;
    `);

    return (result.rows as any[])
      .map((v) =>
        mapDbVideoToYouTubeVideo(v, {
          title: yc.title,
          thumbnailMedium: yc.thumbnailMedium,
        }),
      )
      .filter((v): v is YouTubeVideo => v !== null);
  });

export const updateUserChannel = createServerFn({ method: "POST" })
  .validator((input: { id: string; handle: string }) => input)
  .handler(async ({ data: { id, handle } }) => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      const [updated] = await db
        .update(channels)
        .set({ handle: normalizeHandle(handle) })
        .where(and(eq(channels.id, id), eq(channels.userId, userId)))
        .returning();

      return updated;
    } catch (err: unknown) {
      console.error("[Channels Action] updateUserChannel error:", err);
      throw err;
    }
  });
