import { createServerFn } from "@tanstack/react-start";
import { db } from "#/db";
import { history } from "#/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureSession } from "#/lib/auth.functions";

export const recordHistory = createServerFn({ method: "POST" })
  .inputValidator((data: {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    duration?: string | null;
    viewCount?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      // Check if already exists
      const existing = await db.query.history.findFirst({
        where: and(eq(history.userId, userId), eq(history.videoId, data.videoId)),
      });

      if (existing) {
        // Update watchedAt
        await db.update(history)
          .set({ watchedAt: new Date() })
          .where(eq(history.id, existing.id));
        return { success: true, updated: true };
      }

      // Insert new record
      await db.insert(history).values({
        userId,
        ...data,
        watchedAt: new Date(),
      });

      return { success: true, updated: false };
    } catch (err: any) {
      console.error("[History Action] recordHistory error:", err);
      throw err;
    }
  });

export const getHistory = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await ensureSession();
    const userId = session.user.id;
    if (!userId) return [];

    return await db.query.history.findMany({
      where: eq(history.userId, userId),
      orderBy: [desc(history.watchedAt)],
    });
  } catch (err: any) {
    console.error("[History Action] getHistory error:", err);
    throw err;
  }
});

export const getWatchedVideoIds = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await ensureSession();
    const userId = session.user.id;
    if (!userId) return [];

    const historyItems = await db.query.history.findMany({
      where: eq(history.userId, userId),
      columns: { videoId: true },
    });
    return historyItems.map((h) => h.videoId);
  } catch (err: any) {
    console.error("[History Action] getWatchedVideoIds error:", err);
    throw err;
  }
});

export const deleteHistoryItem = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      await db.delete(history).where(and(eq(history.id, id), eq(history.userId, userId)));
      return { success: true };
    } catch (err: any) {
      console.error("[History Action] deleteHistoryItem error:", err);
      throw err;
    }
  });

export const clearHistory = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const session = await ensureSession();
    const userId = session.user.id;
    if (!userId) throw new Error("Unauthorized");

    await db.delete(history).where(eq(history.userId, userId));
    return { success: true };
  } catch (err: any) {
    console.error("[History Action] clearHistory error:", err);
    throw err;
  }
});
