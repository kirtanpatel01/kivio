import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { youtubeChannels, videos } from "#/db/schema";
import { getEnvVar } from "#/lib/server-utils";
import { normalizeHandle } from "#/lib/utils";
import type { YouTubeChannelDetails } from "#/types";
import { syncChannelVideosExhaustive } from "./sync";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const fetchChannelByHandle = createServerFn({ method: "GET" })
	.inputValidator((handle: string) => handle)
	.handler(async ({ data: handle }) => {
		if (!handle || handle.trim() === "" || handle.trim() === "@") return null;

		const cleanHandle = normalizeHandle(handle);

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
