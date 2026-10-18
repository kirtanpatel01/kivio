import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("1. Adding columns to videos table...");
  const statements = [
    sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS title text;`,
    sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;`,
    sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail text;`,
    sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration text;`,
    sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS view_count text;`,
    sql`CREATE INDEX IF NOT EXISTS videos_published_at_idx ON videos (published_at DESC);`,
    sql`CREATE INDEX IF NOT EXISTS videos_channel_pub_idx ON videos (channel_id, published_at DESC);`,
    sql`CREATE INDEX IF NOT EXISTS videos_title_idx ON videos (title);`,
  ];

  for (const stmt of statements) {
    await db.execute(stmt);
  }

  console.log("2. Backfilling existing video rows...");
  await db.execute(sql`
    UPDATE videos SET
      title = COALESCE(raw_video -> 'snippet' ->> 'title', raw_playlist_item -> 'snippet' ->> 'title', id),
      published_at = COALESCE((raw_video -> 'snippet' ->> 'publishedAt')::timestamp with time zone, (raw_playlist_item -> 'contentDetails' ->> 'videoPublishedAt')::timestamp with time zone, created_at),
      thumbnail = COALESCE(raw_video -> 'snippet' -> 'thumbnails' -> 'high' ->> 'url', raw_video -> 'snippet' -> 'thumbnails' -> 'medium' ->> 'url', raw_playlist_item -> 'snippet' -> 'thumbnails' -> 'high' ->> 'url', ''),
      duration = raw_video -> 'contentDetails' ->> 'duration',
      view_count = raw_video -> 'statistics' ->> 'viewCount'
    WHERE title IS NULL OR published_at IS NULL;
  `);

  console.log("3. Verifying updated rows...");
  const sample = await db.execute(sql`
    SELECT id, title, published_at, thumbnail FROM videos LIMIT 3;
  `);
  console.log("Sample flattened rows:", sample.rows);

  console.log("Migration and backfill completed successfully!");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
