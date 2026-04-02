import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
  integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const channels = pgTable("channels", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	handle: text("handle")
		.notNull()
		.references(() => youtubeChannels.handle, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const youtubeChannels = pgTable("youtube_channels", {
	handle: text("handle").primaryKey(), // lowercase, e.g. "@mkbhd"

	// Channel info
	channelId: text("channel_id").notNull().unique(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	customUrl: text("custom_url").notNull(),
	publishedAt: text("published_at").notNull(),
	country: text("country"),

	// Thumbnails
	thumbnailDefault: text("thumbnail_default").notNull(),
	thumbnailMedium: text("thumbnail_medium").notNull(),
	thumbnailHigh: text("thumbnail_high").notNull(),

	// Statistics
	viewCount: text("view_count").notNull(),
	subscriberCount: text("subscriber_count").notNull(),
	videoCount: text("video_count").notNull(),
	uploadsPlaylistId: text("uploads_playlist_id").notNull(),

	// Webhook Subscription Metadata
	subscriptionLeaseExpiresAt: timestamp("subscription_lease_expires_at", {
		withTimezone: true,
	}),
	subscriptionSecret: text("subscription_secret"),

	// Cache metadata
	fetchedAt: timestamp("fetched_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const videos = pgTable(
	"videos",
	{
		id: text("id").primaryKey(), // YouTube Video ID
		channelId: text("channel_id")
			.notNull()
			.references(() => youtubeChannels.channelId, { onDelete: "cascade" }),
		/**
		 * Exact YouTube API payloads.
		 * These are the source-of-truth; the app derives display fields from them.
		 */
		rawPlaylistItem: jsonb("raw_playlist_item"),
		rawVideo: jsonb("raw_video"),
		/**
		 * Derived short classification (duration-only for now).
		 * - `durationSeconds` comes from rawVideo.contentDetails.duration
		 * - `isShort` is true when durationSeconds < 180
		 *
		 * Nullable so migrations can succeed without backfilling existing rows.
		 */
		durationSeconds: integer("duration_seconds"),
		isShort: boolean("is_short"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("videos_channelId_idx").on(table.channelId)],
);

export const notifications = pgTable(
	"notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		videoId: text("video_id")
			.notNull()
			.references(() => videos.id, { onDelete: "cascade" }),
		isRead: boolean("is_read").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("notifications_userId_idx").on(table.userId),
		index("notifications_userId_isRead_idx").on(table.userId, table.isRead),
	],
);

export const history = pgTable("history", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	videoId: text("video_id").notNull(),
	title: text("title").notNull(),
	channelTitle: text("channel_title").notNull(),
	thumbnail: text("thumbnail").notNull(),
	duration: text("duration"),
	viewCount: text("view_count"),
	watchedAt: timestamp("watched_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	channels: many(channels),
	history: many(history),
	notifications: many(notifications),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const channelRelations = relations(channels, ({ one }) => ({
	user: one(user, {
		fields: [channels.userId],
		references: [user.id],
	}),
	youtubeChannel: one(youtubeChannels, {
		fields: [channels.handle],
		references: [youtubeChannels.handle],
	}),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
	youtubeChannel: one(youtubeChannels, {
		fields: [videos.channelId],
		references: [youtubeChannels.channelId],
	}),
	notifications: many(notifications),
	history: many(history),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id],
	}),
	video: one(videos, {
		fields: [notifications.videoId],
		references: [videos.id],
	}),
}));

export const historyRelations = relations(history, ({ one }) => ({
	user: one(user, {
		fields: [history.userId],
		references: [user.id],
	}),
	video: one(videos, {
		fields: [history.videoId],
		references: [videos.id],
	}),
}));
