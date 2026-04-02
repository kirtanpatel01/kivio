import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, videos } from "#/db/schema";
import { ensureSession } from "#/lib/auth.functions";
import { getEnvVar } from "#/lib/server-utils";
import { parseISO8601DurationToSeconds } from "#/lib/utils";

/**
 * EXHAUSTIVE SYNC: Fetches EVERY video for a channel using YouTube's playlistItems API.
 * This function will keep looping until it finds the very first video ever uploaded.
 */
export const syncChannelVideosExhaustive = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { channelId: string; uploadsPlaylistId: string }) => data,
	)
	.handler(async ({ data }) => {
		const { channelId, uploadsPlaylistId } = data;
		const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
		if (!apiKey) throw new Error("YouTube API Key not configured.");

		let nextPageToken: string | undefined;
		let totalSynced = 0;

		console.log(`[Sync] Starting exhaustive sync for ${channelId}...`);

		try {
			do {
				// 1. Fetch Page (50 videos max)
				let url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${encodeURIComponent(uploadsPlaylistId)}&part=snippet,contentDetails&key=${apiKey}&maxResults=50`;
				if (nextPageToken)
					url += `&pageToken=${encodeURIComponent(nextPageToken)}`;

				const res = await fetch(url);
				if (!res.ok) throw new Error(`YouTube API error: ${await res.text()}`);

				const payload = await res.json();
				const items = payload.items || [];
				if (items.length === 0) break;

				// 2. Fetch Details (Duration, Views, Likes, Description)
				const videoIds = items
					.map((item: any) => item.contentDetails.videoId)
					.join(",");
				const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=snippet,contentDetails,statistics&key=${apiKey}`;
				const detailsRes = await fetch(detailsUrl);
				const detailsData = await detailsRes.json();

				const detailsMap = new Map<string, any>(
					detailsData.items.map((v: any) => [v.id, v]),
				);

				// 3. Prepare and Batch Upsert
				type VideoRowInsert = {
					id: string;
					channelId: string;
					rawPlaylistItem: any;
					rawVideo: any;
					durationSeconds: number | null;
					isShort: boolean | null;
				};

				const videoRowsWithNulls = items.map(
					(item: any): VideoRowInsert | null => {
						const videoId = item.contentDetails.videoId;
						const details = detailsMap.get(videoId);

						if (!details) return null;

						const durationIso: string | undefined =
							details?.contentDetails?.duration;
						const durationSeconds = durationIso
							? parseISO8601DurationToSeconds(durationIso)
							: null;
						const isShort =
							durationSeconds !== null ? durationSeconds < 180 : null;

						return {
							id: videoId,
							channelId,
							// Preserve full payloads from both API calls so we can derive new fields later.
							rawPlaylistItem: item,
							rawVideo: details,
							durationSeconds,
							isShort,
						};
					},
				);

				const videoRows = videoRowsWithNulls.filter(
					(row: VideoRowInsert | null): row is VideoRowInsert => row !== null,
				);

				await db
					.insert(videos)
					.values(videoRows)
					.onConflictDoUpdate({
						target: videos.id,
						set: {
							rawPlaylistItem: sql`excluded.raw_playlist_item`,
							rawVideo: sql`excluded.raw_video`,
							durationSeconds: sql`excluded.duration_seconds`,
							isShort: sql`excluded.is_short`,
						},
					});

				totalSynced += items.length;
				nextPageToken = payload.nextPageToken;

				console.log(`[Sync] Synced ${totalSynced} videos for ${channelId}...`);
			} while (nextPageToken);

			console.log(
				`[Sync] Completed. ${totalSynced} videos in database for ${channelId}.`,
			);
			return { totalSynced };
		} catch (error) {
			console.error(`[Sync] Exhaustive sync failed for ${channelId}:`, error);
			throw error;
		}
	});

export const syncAllSubscribedChannels = createServerFn({
	method: "POST",
}).handler(async () => {
	const session = await ensureSession();
	const userId = session.user.id;
	if (!userId) throw new Error("Unauthorized");

	const userChannels = await db.query.channels.findMany({
		where: eq(channels.userId, userId),
		with: { youtubeChannel: true },
	});

	for (const uc of userChannels) {
		if (uc.youtubeChannel) {
			await syncChannelVideosExhaustive({
				data: {
					channelId: uc.youtubeChannel.channelId,
					uploadsPlaylistId: uc.youtubeChannel.uploadsPlaylistId,
				},
			});
		}
	}
	return { success: true };
});
