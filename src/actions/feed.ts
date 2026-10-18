import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels } from "#/db/schema";
import { getSession } from "#/lib/auth.functions";
import type { YouTubeVideo } from "#/types";
import { mapDbVideoToYouTubeVideo } from "./videos";

export const fetchFeedForUser = createServerFn({ method: "GET" })
  .validator(
    (data?: {
      page?: number;
      limit?: number;
      q?: string;
      channelIds?: string[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) return { videos: [], hasMore: false };

    const page = data?.page ?? 0;
    const limit = data?.limit ?? 20;
    const q = data?.q?.trim();
    const filterChannelIds = data?.channelIds;

    const userChannels = await db.query.channels.findMany({
      where: eq(channels.userId, userId),
      with: { youtubeChannel: true },
    });

    if (userChannels.length === 0) return { videos: [], hasMore: false };
    const allChannelIds = userChannels
      .map((uc) => uc.youtubeChannel?.channelId)
      .filter(Boolean) as string[];

    const activeChannelIds =
      filterChannelIds && filterChannelIds.length > 0
        ? allChannelIds.filter((id) => filterChannelIds.includes(id))
        : allChannelIds;

    if (activeChannelIds.length === 0) return { videos: [], hasMore: false };

    const searchFilter = q
      ? sql`AND (v."raw_video" -> 'snippet' ->> 'title' ILIKE ${`%${q}%`} OR v."raw_playlist_item" -> 'snippet' ->> 'title' ILIKE ${`%${q}%`})`
      : sql``;

    const channelList = sql.join(
      activeChannelIds.map((id) => sql`${id}`),
      sql`, `,
    );

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
        v."raw_video" -> 'statistics' ->> 'viewCount' as "viewCount",
        yc."title" as "channelTitle",
        yc."thumbnail_medium" as "channelAvatar"
      FROM "videos" v
      LEFT JOIN "youtube_channels" yc ON v."channel_id" = yc."channel_id"
      WHERE v."channel_id" IN (${channelList})
        AND (v."is_short" IS NOT TRUE OR v."is_short" IS NULL)
        ${searchFilter}
      ORDER BY (v."raw_video" -> 'snippet' ->> 'publishedAt') DESC
      LIMIT ${limit + 1}
      OFFSET ${page * limit};
    `);

    const rows = result.rows as any[];
    const hasMore = rows.length > limit;
    const feedVideos = rows
      .slice(0, limit)
      .map((v) => mapDbVideoToYouTubeVideo(v))
      .filter((v): v is YouTubeVideo => v !== null);

    return { videos: feedVideos, hasMore };
  });

export const fetchShortsForUser = createServerFn({ method: "GET" })
  .validator(
    (data?: { page?: number; limit?: number; currentVideoId?: string }) => data,
  )
  .handler(async ({ data }) => {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) return { videos: [], hasMore: false };

    const page = data?.page ?? 0;
    const limit = data?.limit ?? 10;
    const currentVideoId = data?.currentVideoId;

    const userChannels = await db.query.channels.findMany({
      where: eq(channels.userId, userId),
      with: { youtubeChannel: true },
    });

    if (userChannels.length === 0) return { videos: [], hasMore: false };

    const channelIds = userChannels
      .map((uc) => uc.youtubeChannel?.channelId)
      .filter(Boolean) as string[];

    const channelList = sql.join(
      channelIds.map((id) => sql`${id}`),
      sql`, `,
    );

    let rows = (
      await db.execute(sql`
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
          v."raw_video" -> 'statistics' ->> 'viewCount' as "viewCount",
          yc."title" as "channelTitle",
          yc."thumbnail_medium" as "channelAvatar"
        FROM "videos" v
        LEFT JOIN "youtube_channels" yc ON v."channel_id" = yc."channel_id"
        WHERE v."channel_id" IN (${channelList})
          AND v."is_short" IS TRUE
        ORDER BY (v."raw_video" -> 'snippet' ->> 'publishedAt') DESC
        LIMIT ${limit + 1}
        OFFSET ${page * limit};
      `)
    ).rows as any[];

    if (
      page === 0 &&
      currentVideoId &&
      !rows.some((v) => v.id === currentVideoId)
    ) {
      const specific = (
        await db.execute(sql`
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
            v."raw_video" -> 'statistics' ->> 'viewCount' as "viewCount",
            yc."title" as "channelTitle",
            yc."thumbnail_medium" as "channelAvatar"
          FROM "videos" v
          LEFT JOIN "youtube_channels" yc ON v."channel_id" = yc."channel_id"
          WHERE v."id" = ${currentVideoId}
          LIMIT 1;
        `)
      ).rows[0] as any;
      if (specific) {
        rows = [specific, ...rows];
      }
    }

    const hasMore = rows.length > limit;
    const feedVideos = rows
      .slice(0, limit)
      .map((v) => mapDbVideoToYouTubeVideo(v))
      .filter((v): v is YouTubeVideo => v !== null);

    return { videos: feedVideos, hasMore };
  });
