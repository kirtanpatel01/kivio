import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, videos, youtubeChannels } from "#/db/schema";
import { ensureSession } from "#/lib/auth.functions";
import { getEnvVar } from "#/lib/server-utils";
import { parseISO8601Duration } from "#/lib/utils";
import type { YouTubeChannelDetails, YouTubeVideo } from "#/types";
import { syncChannelVideosExhaustive } from "./sync";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const fetchChannelByHandle = createServerFn({ method: "GET" })
	.inputValidator((handle: string) => handle)
	.handler(async ({ data: handle }) => {
		if (!handle || handle.trim() === "" || handle.trim() === "@") return null;

		const cleanHandle = (
			handle.startsWith("@") ? handle : `@${handle}`
		).toLowerCase();

		// 1. Check database cache
		const cached = await db.query.youtubeChannels.findFirst({
			where: eq(youtubeChannels.handle, cleanHandle),
		});

		if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
			// If we have cached channel details but haven't stored any videos yet
			// (e.g. after schema changes in development), backfill now.
			const hasVideos = await db.query.videos.findFirst({
				where: eq(videos.channelId, cached.channelId),
				columns: { id: true },
			});

			if (!hasVideos) {
				syncChannelVideosExhaustive({
					data: {
						channelId: cached.channelId,
						uploadsPlaylistId: cached.uploadsPlaylistId,
					},
				}).catch((err) =>
					console.error(
						`[CachedSync] Failed for ${cached.channelId}:`,
						err,
					),
				);
			}

			return {
				id: cached.channelId,
				title: cached.title,
				description: cached.description,
				customUrl: cached.customUrl,
				publishedAt: cached.publishedAt,
				country: cached.country ?? undefined,
				thumbnails: {
					default: { url: cached.thumbnailDefault },
					medium: { url: cached.thumbnailMedium },
					high: { url: cached.thumbnailHigh },
				},
				statistics: {
					viewCount: cached.viewCount,
					subscriberCount: cached.subscriberCount,
					videoCount: cached.videoCount,
				},
				uploadsPlaylistId: cached.uploadsPlaylistId,
			} as YouTubeChannelDetails;
		}

		// 2. Cache miss — Fetch from YouTube API
		const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
		if (!apiKey) throw new Error("YouTube API Key not configured.");

		const url = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(cleanHandle)}&part=snippet,statistics,contentDetails&key=${apiKey}`;

		try {
			const res = await fetch(url);
			if (!res.ok) return null;

			const data = await res.json();
			if (!data.items || data.items.length === 0) return null;

			const item = data.items[0];
			const result: YouTubeChannelDetails = {
				id: item.id,
				title: item.snippet.title,
				description: item.snippet.description,
				customUrl: item.snippet.customUrl,
				publishedAt: item.snippet.publishedAt,
				country: item.snippet.country,
				thumbnails: item.snippet.thumbnails,
				statistics: {
					viewCount: item.statistics.viewCount,
					subscriberCount: item.statistics.subscriberCount,
					videoCount: item.statistics.videoCount,
				},
				uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
			};

			// 3. Upsert channel cache
			const row = {
				handle: cleanHandle,
				channelId: result.id,
				title: result.title,
				description: result.description,
				customUrl: result.customUrl,
				publishedAt: result.publishedAt,
				country: result.country ?? null,
				thumbnailDefault: result.thumbnails.default.url,
				thumbnailMedium: result.thumbnails.medium.url,
				thumbnailHigh: result.thumbnails.high.url,
				viewCount: result.statistics.viewCount,
				subscriberCount: result.statistics.subscriberCount,
				videoCount: result.statistics.videoCount,
				uploadsPlaylistId: result.uploadsPlaylistId,
				fetchedAt: new Date(),
			};

			await db
				.insert(youtubeChannels)
				.values(row)
				.onConflictDoUpdate({
					target: youtubeChannels.handle,
					set: { ...row, handle: undefined },
				});

			// 4. Trigger EXHAUSTIVE Sync in background
			syncChannelVideosExhaustive({
				data: {
					channelId: result.id,
					uploadsPlaylistId: result.uploadsPlaylistId,
				},
			}).catch((err) =>
				console.error(`[InitialSync] Failed for ${result.id}:`, err),
			);

			return result;
		} catch (e: unknown) {
			console.error("[YouTube API] Error:", e);
			throw e;
		}
	});

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
			.map((v): YouTubeVideo | null => {
				const rawVideo = v.rawVideo as any;
				const rawSnippet = rawVideo?.snippet ?? null;
				const rawContentDetails = rawVideo?.contentDetails ?? null;
				const rawStatistics = rawVideo?.statistics ?? null;
				const rawPlaylistItemSnippet =
					(v.rawPlaylistItem as any)?.snippet ?? null;

				const publishedAt =
					rawSnippet?.publishedAt ?? rawPlaylistItemSnippet?.publishedAt;
				if (!publishedAt) return null;

				const durationIso = rawContentDetails?.duration;
				const duration = durationIso ? parseISO8601Duration(durationIso) : null;

				const thumb =
					rawSnippet?.thumbnails?.high?.url ??
					rawSnippet?.thumbnails?.default?.url ??
					"";

				return {
					id: v.id,
					title: rawSnippet?.title ?? "(untitled)",
					thumbnail: thumb,
					publishedAt: publishedAt as string,
					duration: duration || null,
					viewCount: rawStatistics?.viewCount ?? undefined,
					likeCount: rawStatistics?.likeCount ?? undefined,
					channelId: v.channelId,
					channelTitle: v.youtubeChannel?.title ?? "",
					channelAvatar: v.youtubeChannel?.thumbnailMedium ?? "",
					uploadsPlaylistId: (v.youtubeChannel as any)?.uploadsPlaylistId,
				} as YouTubeVideo;
			})
			.filter((v): v is YouTubeVideo => v !== null);
	});

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
			where: inArray(videos.channelId, channelIds),
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
			const channel = userChannels.find(
				(uc) => uc.youtubeChannel?.channelId === v.channelId,
			);

			const rawVideo = v.rawVideo as any;
			const rawSnippet = rawVideo?.snippet ?? null;
			const rawContentDetails = rawVideo?.contentDetails ?? null;
			const rawStatistics = rawVideo?.statistics ?? null;
			const rawPlaylistItemSnippet =
				(v.rawPlaylistItem as any)?.snippet ?? null;

			const publishedAt =
				rawSnippet?.publishedAt ?? rawPlaylistItemSnippet?.publishedAt;
			return {
				id: v.id,
				title: rawSnippet?.title ?? "(untitled)",
				thumbnail:
					rawSnippet?.thumbnails?.high?.url ??
					rawSnippet?.thumbnails?.default?.url ??
					"",
				publishedAt: (publishedAt as string) ?? new Date(0).toISOString(),
				duration: rawContentDetails?.duration
					? parseISO8601Duration(rawContentDetails.duration)
					: null,
				viewCount: rawStatistics?.viewCount ?? undefined,
				likeCount: rawStatistics?.likeCount ?? undefined,
				channelId: v.channelId,
				channelTitle: channel?.youtubeChannel?.title ?? "",
				channelAvatar: channel?.youtubeChannel?.thumbnailMedium ?? "",
			};
		});

		return { videos: feedVideos, hasMore };
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
