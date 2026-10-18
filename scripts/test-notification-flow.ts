import { makeSignature } from "better-auth/crypto";
import { db } from "../src/db";
import { session, notifications } from "../src/db/schema";
import { desc, eq } from "drizzle-orm";

async function main() {
  console.log("=== KIVIO NOTIFICATION FLOW VERIFICATION ===");

  // 1. Find the latest active session in the database
  const activeSessions = await db
    .select()
    .from(session)
    .orderBy(desc(session.createdAt))
    .limit(1);

  if (activeSessions.length === 0) {
    console.error("No active user session found in the database. Please log in first.");
    process.exit(1);
  }

  const userSession = activeSessions[0];
  const token = userSession.token;
  const userId = userSession.userId;
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    console.error("BETTER_AUTH_SECRET is missing from environment!");
    process.exit(1);
  }

  console.log(`1. Found active session for user: ${userId}`);
  const sig = await makeSignature(token, secret);
  const cookieHeader = `better-auth.session_token=${encodeURIComponent(token + "." + sig)}`;

  // 2. Count existing notifications
  const beforeCount = (
    await db.select().from(notifications).where(eq(notifications.userId, userId))
  ).length;
  console.log(`2. Current notifications for user in DB: ${beforeCount}`);

  // 3. Connect to SSE stream
  console.log("3. Connecting to SSE endpoint: http://localhost:3000/api/notifications/stream...");
  const controller = new AbortController();
  let sseReceived = false;

  const timeoutTimer = setTimeout(() => {
    console.log("\n[WARNING] SSE event timed out after 12s. Checking if DB recorded the notification...");
    controller.abort();
  }, 12000);

  const ssePromise = fetch("http://localhost:3000/api/notifications/stream", {
    headers: {
      Cookie: cookieHeader,
    },
    signal: controller.signal,
  }).then(async (res) => {
    console.log(`   SSE Response status: ${res.status}`);
    if (res.status !== 200) {
      console.error(`   SSE Connection Failed (${res.status}):`, await res.text());
      return;
    }
    console.log("   SSE connection opened successfully! Listening for real-time events...");

    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      console.log(`   [SSE Event Received]: ${text.trim()}`);
      if (text.includes('"type":"refresh"')) {
        sseReceived = true;
        console.log("   >>> [SUCCESS] Real-time SSE refresh event received! <<<");
        clearTimeout(timeoutTimer);
        controller.abort();
        break;
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") {
      console.error("   SSE error:", err);
    }
  });

  // Give SSE 1.5 seconds to open and subscribe
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 4. Send WebSub Atom XML POST to /api/webhooks/youtube
  console.log("\n4. Triggering WebSub POST ping to http://localhost:3000/api/webhooks/youtube...");
  // Channel Chai aur Code: UCNQ6FEtztATuaVhZKCY28Yw followed by our user
  const channelId = "UCNQ6FEtztATuaVhZKCY28Yw";
  const testVideoId = "dQw4w9WgXcQ";

  const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
  <link rel="self" href="https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}"/>
  <title>YouTube video feed</title>
  <entry>
    <id>yt:video:${testVideoId}</id>
    <yt:videoId>${testVideoId}</yt:videoId>
    <yt:channelId>${channelId}</yt:channelId>
    <title>Chai aur Code Live Test Notification</title>
  </entry>
</feed>`;

  const webhookRes = await fetch("http://localhost:3000/api/webhooks/youtube", {
    method: "POST",
    headers: {
      "Content-Type": "application/atom+xml",
      Link: `<https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}>; rel="self", <https://pubsubhubbub.appspot.com/>; rel="hub"`,
    },
    body: atomXml,
  });

  console.log(`   Webhook POST status: ${webhookRes.status} (Expected: 204)`);

  await ssePromise;

  // 5. Verify database notification (allow 3s for background sync to complete)
  console.log("   Waiting 3s for background sync and DB insertion to finish...");
  await new Promise((r) => setTimeout(r, 3000));

  const afterCount = (
    await db.select().from(notifications).where(eq(notifications.userId, userId))
  ).length;
  console.log(`\n5. Verifying DB state: Notifications count went from ${beforeCount} to ${afterCount}.`);

  console.log("\n=== SUMMARY ===");
  console.log(`- Webhook Endpoint Status: ${webhookRes.status === 204 ? "PASS (204 No Content)" : "FAIL"}`);
  console.log(`- Real-time SSE Broadcast: ${sseReceived ? "PASS" : "FAIL"}`);
  console.log(`- Database Notification Insert: ${afterCount > beforeCount ? "PASS" : "FAIL"}`);

  if (webhookRes.status === 204 && sseReceived && afterCount > beforeCount) {
    console.log("\nALL NOTIFICATION TESTS PASSED!");
  } else {
    console.log("\nSOME CHECKS DID NOT PASS. Review the log above.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
