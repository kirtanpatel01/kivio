import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, videos, youtubeChannels } from "#/db/schema";
import { ensureSession } from "#/lib/auth.functions";
import { normalizeHandle } from "#/lib/utils";
import { fetchChannelByHandle } from "./channel";
import { mapDbVideoToYouTubeVideo } from "./videos";
import type { YouTubeVideo } from "#/types";

export const getUserChannels = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
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

import { subscribeToChannelWebhooks } from "./webhooks";

export const addUserChannel = createServerFn({ method: "POST" })
  .inputValidator((handle: string) => handle)
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
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      await db
        .delete(channels)
        .where(and(eq(channels.id, id), eq(channels.userId, userId)));

      return { success: true };
    } catch (err: unknown) {
      console.error("[Channels Action] removeUserChannel error:", err);
      throw err;
    }
  });

/** Videos stored for a channel, scoped to channels the signed-in user follows. */
export const getVideosForChannelHandle = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const session = await ensureSession();
    const userId = session.user.id;
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

    const vids = await db.query.videos.findMany({
      where: eq(videos.channelId, yc.channelId),
      orderBy: [
        desc(
          sql`(${videos.rawVideo} -> 'snippet' ->> 'publishedAt')::timestamptz`,
        ),
      ],
    });

    return vids
      .map((v) =>
        mapDbVideoToYouTubeVideo(v, {
          title: yc.title,
          thumbnailMedium: yc.thumbnailMedium,
        }),
      )
      .filter((v): v is YouTubeVideo => v !== null);
  });

export const updateUserChannel = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; handle: string }) => input)
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
