import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "#/lib/server-utils";
import type { YouTubePlaylist, YouTubeVideo } from "#/types";
import { fetchChannelByHandle } from "./channel";
import { db } from "#/db";
import { playlists } from "#/db/schema";
import { eq, sql } from "drizzle-orm";

export const fetchPlaylistsByHandle = createServerFn({ method: "GET" })
	.inputValidator((handle: string) => handle)
	.handler(async ({ data: handle }): Promise<YouTubePlaylist[]> => {
		// 1. Resolve handle to channel details to get channelId
		const channel = await fetchChannelByHandle({ data: handle });
		if (!channel) return [];

		// 2. Check Cache
		const cached = await db.query.playlists.findMany({
			where: eq(playlists.channelId, channel.id),
		});

		// If cache is fresh (less than 24h old), return it
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const isFresh = cached.length > 0 && (cached[0]?.fetchedAt ?? new Date(0)) > oneDayAgo;

		if (isFresh) {
			return cached.map(p => ({
				id: p.id,
				title: p.title,
				description: p.description ?? "",
				thumbnail: p.thumbnail,
				itemCount: p.itemCount,
				publishedAt: p.publishedAt,
				channelId: p.channelId,
				channelTitle: channel.title,
			}));
		}

		// 3. Cache missing or stale: Fetch from API
		const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
		if (!apiKey) throw new Error("YouTube API Key not configured.");

		const url = `https://www.googleapis.com/youtube/v3/playlists?channelId=${channel.id}&part=snippet,contentDetails&maxResults=50&key=${apiKey}`;

		try {
			const res = await fetch(url);
			if (!res.ok) return isFresh ? (cached as any) : [];

			const data = await res.json();
			if (!data.items) return [];

			const playlistItems: (typeof playlists.$inferInsert)[] = data.items.map((item: any) => ({
				id: item.id as string,
				channelId: channel.id,
				title: item.snippet.title as string,
				description: item.snippet.description as string,
				thumbnail: (item.snippet.thumbnails.high || item.snippet.thumbnails.default).url as string,
				itemCount: item.contentDetails.itemCount as number,
				publishedAt: item.snippet.publishedAt as string,
				fetchedAt: new Date(),
			}));

			// 4. Update Cache
			if (playlistItems.length > 0) {
				await db.insert(playlists)
					.values(playlistItems)
					.onConflictDoUpdate({
						target: playlists.id,
						set: {
							title: sql`excluded.title`,
							description: sql`excluded.description`,
							thumbnail: sql`excluded.thumbnail`,
							itemCount: sql`excluded.item_count`,
							fetchedAt: new Date(),
						}
					});
			}

			return playlistItems.map(p => ({
				id: p.id as string,
				title: p.title as string,
				description: p.description ?? "",
				thumbnail: p.thumbnail as string,
				itemCount: p.itemCount as number,
				publishedAt: p.publishedAt as string,
				channelId: p.channelId as string,
				channelTitle: channel.title,
			}));
		} catch (e: unknown) {
			console.error("[YouTube API] fetchPlaylistsByHandle error:", e);
			// Fallback to stale cache if API fails
			if (cached.length > 0) {
				return cached.map(p => ({
					id: p.id,
					title: p.title,
					description: p.description ?? "",
					thumbnail: p.thumbnail,
					itemCount: p.itemCount,
					publishedAt: p.publishedAt,
					channelId: p.channelId,
					channelTitle: channel.title,
				}));
			}
			throw e;
		}
	});

export const fetchPlaylistVideos = createServerFn({ method: "GET" })
	.inputValidator((playlistId: string) => playlistId)
	.handler(async ({ data: playlistId }): Promise<YouTubeVideo[]> => {
		const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
		if (!apiKey) throw new Error("YouTube API Key not configured.");

		const url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${encodeURIComponent(playlistId)}&part=snippet,contentDetails&maxResults=50&key=${apiKey}`;

		try {
			const res = await fetch(url);
			if (!res.ok) return [];

			const data = await res.json();
			if (!data.items) return [];

			return data.items.map((item: any) => ({
				id: item.contentDetails.videoId,
				title: item.snippet.title,
				thumbnail: (item.snippet.thumbnails.high || item.snippet.thumbnails.default).url,
				publishedAt: item.contentDetails.videoPublishedAt || item.snippet.publishedAt,
				channelId: item.snippet.channelId,
				channelTitle: item.snippet.channelTitle,
				// Note: Playlists don't include views/likes/duration/avatar for each video in this API call.
				// We'll use fallbacks or placeholders for those in the UI.
				channelAvatar: "",
			})) as YouTubeVideo[];
		} catch (e: unknown) {
			console.error("[YouTube API] fetchPlaylistVideos error:", e);
			throw e;
		}
	});

export const fetchPlaylistById = createServerFn({ method: "GET" })
	.inputValidator((playlistId: string) => playlistId)
	.handler(async ({ data: id }): Promise<YouTubePlaylist | null> => {
		// Try DB first
		const cached = await db.query.playlists.findFirst({
			where: eq(playlists.id, id),
		});

		if (cached) {
			return {
				id: cached.id,
				title: cached.title,
				description: cached.description ?? "",
				thumbnail: cached.thumbnail,
				itemCount: cached.itemCount,
				publishedAt: cached.publishedAt,
				channelId: cached.channelId,
				channelTitle: "", // We can fetch this if needed
			};
		}

		// Fallback to API if not cached
		const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
		if (!apiKey) throw new Error("YouTube API Key not configured.");

		const url = `https://www.googleapis.com/youtube/v3/playlists?id=${encodeURIComponent(id)}&part=snippet,contentDetails&key=${apiKey}`;

		try {
			const res = await fetch(url);
			if (!res.ok) return null;
			const data = await res.json();
			if (!data.items || data.items.length === 0) return null;

			const item = data.items[0];
			return {
				id: item.id,
				title: item.snippet.title,
				description: item.snippet.description,
				thumbnail: (item.snippet.thumbnails.high || item.snippet.thumbnails.default).url,
				itemCount: item.contentDetails.itemCount,
				publishedAt: item.snippet.publishedAt,
				channelId: item.snippet.channelId,
				channelTitle: item.snippet.channelTitle,
			};
		} catch (e: unknown) {
			console.error("[YouTube API] fetchPlaylistById error:", e);
			return null;
		}
	});
