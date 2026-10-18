import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, videos, youtubeChannels } from "#/db/schema";
import { getSession, ensureSession } from "#/lib/auth.functions";
import { normalizeHandle } from "#/lib/utils";
import { fetchChannelByHandle } from "./channel";
import { syncChannelVideosBoundedInternal } from "./sync";
import { mapDbVideoToYouTubeVideo } from "./videos";
import type { YouTubeVideo } from "#/types";
import {
  subscribeToChannelWebhooks,
  unsubscribeFromChannelWebhooks,
} from "./webhooks";

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
        coalesce(v."title", v."id") as "title",
        coalesce(v."published_at"::text, v."created_at"::text) as "publishedAt",
        coalesce(v."thumbnail", '') as "thumbnail",
        v."duration" as "rawDuration",
        v."view_count" as "viewCount"
      FROM "videos" v
      WHERE v."channel_id" = ${yc.channelId}
      ${shortFilter}
      ORDER BY v."published_at" DESC NULLS LAST
      LIMIT 50;
    `);

    let rows = result.rows as any[];

    // Auto-sync on first visit: If DB has 0 videos for this channel, fetch the initial 50 videos now!
    if (rows.length === 0 && yc.uploadsPlaylistId) {
      const hasAnyVideos = await db.query.videos.findFirst({
        where: eq(videos.channelId, yc.channelId),
        columns: { id: true },
      });

      if (!hasAnyVideos) {
        try {
          await syncChannelVideosBoundedInternal({
            channelId: yc.channelId,
            uploadsPlaylistId: yc.uploadsPlaylistId,
            limit: 50,
          });

          // Re-query newly synced videos
          const refreshed = await db.execute(sql`
            SELECT 
              v."id",
              v."channel_id" as "channelId",
              v."duration_seconds" as "durationSeconds",
              v."is_short" as "isShort",
              coalesce(v."title", v."id") as "title",
              coalesce(v."published_at"::text, v."created_at"::text) as "publishedAt",
              coalesce(v."thumbnail", '') as "thumbnail",
              v."duration" as "rawDuration",
              v."view_count" as "viewCount"
            FROM "videos" v
            WHERE v."channel_id" = ${yc.channelId}
            ${shortFilter}
            ORDER BY v."published_at" DESC NULLS LAST
            LIMIT 50;
          `);
          rows = refreshed.rows as any[];
        } catch (syncErr: unknown) {
          console.error(`[AutoSyncOnVisit] Failed for ${yc.channelId}:`, syncErr);
        }
      }
    }

    return rows
      .map((v) =>
        mapDbVideoToYouTubeVideo(v, {
          title: yc.title,
          thumbnailMedium: yc.thumbnailMedium,
        }),
      )
      .filter((v): v is YouTubeVideo => v !== null);
  });

export const syncChannelNow = createServerFn({ method: "POST" })
  .validator((channelId: string) => channelId)
  .handler(async ({ data: channelId }) => {
    const yc = await db.query.youtubeChannels.findFirst({
      where: eq(youtubeChannels.channelId, channelId),
    });
    if (!yc?.uploadsPlaylistId) throw new Error("Channel playlist not found");
    return syncChannelVideosBoundedInternal({
      channelId: yc.channelId,
      uploadsPlaylistId: yc.uploadsPlaylistId,
      limit: 50,
    });
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
