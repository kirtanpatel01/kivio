import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Neon Auth manages the `auth.users` table automatically.
 * We reference its user ID (UUID) as a foreign key — no need for a separate users table.
 */

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  handle: text("handle").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Cache for YouTube channel data fetched from the API.
 * Keyed by lowercase handle (e.g. "@mkbhd").
 * Each field is stored as its own column for queryability.
 */
export const youtubeChannels = pgTable("youtube_channels", {
  handle: text("handle").primaryKey(), // lowercase, e.g. "@mkbhd"

  // Channel info
  channelId: text("channel_id").notNull(),
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

  // Cache metadata
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

