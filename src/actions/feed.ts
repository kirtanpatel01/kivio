import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, videos } from "#/db/schema";
import { ensureSession } from "#/lib/auth.functions";
import type { YouTubeVideo } from "#/types";
import { mapDbVideoToYouTubeVideo } from "./videos";

export const fetchFeedForUser = createServerFn({ method: "GET" })
	.inputValidator((data?: { page?: number; limit?: number }) => data)
	.handler(async ({ data }) => {
		const session = await ensureSession();
		const userId = session.user.id;
		const page = data?.page ?? 0;
		const limit = data?.limit ?? 20;

		const userChannels = await db.query.channels.findMany({
			where: eq(channels.userId, userId),
			with: { youtubeChannel: true },
		});

		if (userChannels.length === 0) return { videos: [], hasMore: false };

		const channelIds = userChannels
			.map((uc) => uc.youtubeChannel?.channelId)
			.filter(Boolean) as string[];

		const result = await db.query.videos.findMany({
			where: sql`${inArray(videos.channelId, channelIds)} AND (${videos.isShort} IS NOT TRUE OR ${videos.isShort} IS NULL)`,
			with: {
				youtubeChannel: true,
			},
			orderBy: [
				desc(
					sql`(${videos.rawVideo} -> 'snippet' ->> 'publishedAt')::timestamptz`,
				),
			],
			limit: limit + 1,
			offset: page * limit,
		});

		const hasMore = result.length > limit;
		const feedVideos = result.slice(0, limit).map((v) => {
			const uc = userChannels.find((uc) => uc.youtubeChannel?.channelId === v.channelId);
			const channelInfo = uc?.youtubeChannel 
                ? { title: uc.youtubeChannel.title, thumbnailMedium: uc.youtubeChannel.thumbnailMedium } 
                : undefined;
			return mapDbVideoToYouTubeVideo(v, channelInfo);
		}).filter((v): v is YouTubeVideo => v !== null);

		return { videos: feedVideos, hasMore };
	});

export const fetchShortsForUser = createServerFn({ method: "GET" })
	.inputValidator((data?: { page?: number; limit?: number; currentVideoId?: string }) => data)
	.handler(async ({ data }) => {
		const session = await ensureSession();
		const userId = session.user.id;
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

		let result = await db.query.videos.findMany({
			where: sql`${inArray(videos.channelId, channelIds)} AND ${videos.isShort} IS TRUE`,
			with: { youtubeChannel: true },
			orderBy: [
				desc(
					sql`(${videos.rawVideo} -> 'snippet' ->> 'publishedAt')::timestamptz`,
				),
			],
			limit: limit + 1,
			offset: page * limit,
		});

		if (page === 0 && currentVideoId && !result.some(v => v.id === currentVideoId)) {
			const specific = await db.query.videos.findFirst({
				where: eq(videos.id, currentVideoId),
				with: { youtubeChannel: true },
			});
			if (specific) {
				result = [specific, ...result];
			}
		}

		const hasMore = result.length > limit;
		const feedVideos = result.slice(0, limit).map((v) => {
			const uc = userChannels.find((uc) => uc.youtubeChannel?.channelId === v.channelId);
			const channelInfo = uc?.youtubeChannel 
                ? { title: uc.youtubeChannel.title, thumbnailMedium: uc.youtubeChannel.thumbnailMedium } 
                : undefined;
			return mapDbVideoToYouTubeVideo(v, channelInfo);
		}).filter((v): v is YouTubeVideo => v !== null);

		return { videos: feedVideos, hasMore };
	});
