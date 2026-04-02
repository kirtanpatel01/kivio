import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "#/lib/server-utils";
import type { YouTubePlaylist } from "#/types";
import { fetchChannelByHandle } from "./channel";

export const fetchPlaylistsByHandle = createServerFn({ method: "GET" })
	.inputValidator((handle: string) => handle)
	.handler(async ({ data: handle }): Promise<YouTubePlaylist[]> => {
		const apiKey = getEnvVar("YOUTUBE_API_KEY")?.trim();
		if (!apiKey) throw new Error("YouTube API Key not configured.");

		// 1. Resolve handle to channel details to get channelId
		const channel = await fetchChannelByHandle({ data: handle });
		if (!channel) return [];

		const url = `https://www.googleapis.com/youtube/v3/playlists?channelId=${channel.id}&part=snippet,contentDetails&maxResults=50&key=${apiKey}`;

		try {
			const res = await fetch(url);
			if (!res.ok) return [];

			const data = await res.json();
			if (!data.items) return [];

			return data.items.map((item: any) => ({
				id: item.id,
				title: item.snippet.title,
				description: item.snippet.description,
				thumbnail: (item.snippet.thumbnails.high || item.snippet.thumbnails.default).url,
				itemCount: item.contentDetails.itemCount,
				publishedAt: item.snippet.publishedAt,
				channelId: item.snippet.channelId,
				channelTitle: item.snippet.channelTitle,
			})) as YouTubePlaylist[];
		} catch (e: unknown) {
			console.error("[YouTube API] fetchPlaylistsByHandle error:", e);
			throw e;
		}
	});
