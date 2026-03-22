import { createServerFn } from "@tanstack/react-start";
import { db } from "#/db";
import { channels } from "#/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureSession } from "#/lib/auth.functions";

export const getUserChannels = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const session = await ensureSession();
      const userId = session.user.id;
      if (!userId) {
        console.warn("[Channels Action] Not logged in, returning empty list");
        return [];
      }

      const userChannels = await db.query.channels.findMany({
        where: eq(channels.userId, userId),
        orderBy: (channels, { desc }) => [desc(channels.createdAt)],
      });

      return userChannels;
    } catch (err: any) {
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

      const [newChannel] = await db
        .insert(channels)
        .values({
          userId,
          handle,
        })
        .returning();

      return newChannel;
    } catch (err: any) {
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
    } catch (err: any) {
      console.error("[Channels Action] removeUserChannel error:", err);
      throw err;
    }
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
    } catch (err: any) {
      console.error("[Channels Action] updateUserChannel error:", err);
      throw err;
    }
  });
