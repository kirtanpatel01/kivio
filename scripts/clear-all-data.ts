import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function clearAllData() {
  console.log("Clearing all data from Neon Postgres tables (preserving table structure)...");

  await db.execute(sql`
    TRUNCATE TABLE 
      "notifications",
      "history",
      "channels",
      "playlists",
      "videos",
      "youtube_channels",
      "session",
      "account",
      "verification",
      "user"
    CASCADE;
  `);

  console.log("All tables truncated successfully!");

  // Verify counts
  const tables = [
    "user",
    "session",
    "account",
    "channels",
    "youtube_channels",
    "videos",
    "playlists",
    "notifications",
    "history",
  ];

  for (const t of tables) {
    const res = await db.execute(sql.raw(`SELECT count(*) as count FROM "${t}"`));
    console.log(`Table "${t}" count:`, res.rows[0]);
  }
}

clearAllData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error clearing data:", err);
    process.exit(1);
  });
