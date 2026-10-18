import { EventEmitter } from "node:events";

declare global {
  // eslint-disable-next-line no-var
  var __kivio_notification_events__: EventEmitter | undefined;
}

// Global singleton broadcaster for this server process (preserved across Vite SSR bundles and HMR)
export const notificationEvents: EventEmitter =
  globalThis.__kivio_notification_events__ ?? new EventEmitter();

notificationEvents.setMaxListeners(100);

if (!globalThis.__kivio_notification_events__) {
  globalThis.__kivio_notification_events__ = notificationEvents;
}

export const NOTIFICATION_EVENT = "new_notification";

