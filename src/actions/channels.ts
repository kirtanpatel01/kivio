import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import { channels, videos, youtubeChannels } from "#/db/schema";
import { ensureSession } from "#/lib/auth.functions";
import { fetchChannelByHandle } from "./youtube";

function normalizeHandle(handle: string): string {
	const t = handle.trim();
	if (!t || t === "@") return "";
	const withAt = t.startsWith("@") ? t : `@${t}`;
	return withAt.toLowerCase();
}

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
				orderBy: (channels, { desc }) => [desc(channels.createdAt)],
			});

			return userChannels;
		} catch (err: unknown) {
			console.error("[Channels Action] getUserChannels error:", err);
			throw err;
		}
	},
);

export const addUserChannel = createServerFn({ method: "POST" })
	.inputValidator((handle: string) => handle)
	.handler(async ({ data: handle }) => {
		try {
			const session = await ensureSession();
			const userId = session.user.id;
			if (!userId) throw new Error("Unauthorized");

			const details = await fetchChannelByHandle({ data: handle });
			if (!details) throw new Error("Channel not found");

			await db
				.insert(youtubeChannels)
				.values({
					handle: handle.toLowerCase(),
					channelId: details.id,
					title: details.title,
					description: details.description,
					customUrl: details.customUrl,
					publishedAt: details.publishedAt,
					country: details.country,
					thumbnailDefault: details.thumbnails.default.url,
					thumbnailMedium: details.thumbnails.medium.url,
					thumbnailHigh: details.thumbnails.high.url,
					viewCount: details.statistics.viewCount,
					subscriberCount: details.statistics.subscriberCount,
					videoCount: details.statistics.videoCount,
					uploadsPlaylistId: details.uploadsPlaylistId,
					fetchedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: youtubeChannels.handle,
					set: { fetchedAt: new Date() },
				});

			const [newChannel] = await db
				.insert(channels)
				.values({
					userId,
					handle,
				})
				.returning();

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

		return db.query.videos.findMany({
			where: eq(videos.channelId, yc.channelId),
			orderBy: [
				desc(
					sql`(${videos.rawVideo} -> 'snippet' ->> 'publishedAt')::timestamptz`,
				),
			],
		}) as any;
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
				.set({ handle })
				.where(and(eq(channels.id, id), eq(channels.userId, userId)))
				.returning();

			return updated;
		} catch (err: unknown) {
			console.error("[Channels Action] updateUserChannel error:", err);
			throw err;
		}
	});
