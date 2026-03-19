ALTER TABLE "youtube_channels" ADD COLUMN "channel_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "custom_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "published_at" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "thumbnail_default" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "thumbnail_medium" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "thumbnail_high" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "view_count" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "subscriber_count" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "video_count" text NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" DROP COLUMN "data";