import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "#/db";
import { notifications } from "#/db/schema";
import { ensureSession } from "#/lib/auth.functions";

export const getNotifications = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) return [];

      const result = await db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: [desc(notifications.createdAt)],
        limit: 50,
      });

      return result;
    } catch (err: unknown) {
      console.error("[Notifications Action] getNotifications error:", err);
      throw err;
    }
  },
);

export const markAsRead = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

      return { success: true };
    } catch (err: unknown) {
      console.error("[Notifications Action] markAsRead error:", err);
      throw err;
    }
  });

export const markAllAsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) throw new Error("Unauthorized");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      return { success: true };
    } catch (err: unknown) {
      console.error("[Notifications Action] markAllAsRead error:", err);
      throw err;
    }
  },
);

/**
 * Maintenance task to delete notifications older than 30 days.
 * This can be triggered by a cron job or a background process.
 */
export const deleteOldNotifications = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await db
        .delete(notifications)
        .where(lt(notifications.createdAt, thirtyDaysAgo));

      console.log(`[Cleanup] Deleted old notifications.`);
      return { success: true };
    } catch (err: unknown) {
      console.error("[Cleanup Action] deleteOldNotifications error:", err);
      throw err;
    }
  },
);
