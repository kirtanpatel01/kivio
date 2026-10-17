import { EventEmitter } from "node:events";

// A global singleton broadcaster for this server process
export const notificationEvents = new EventEmitter();

// Allow for multiple listeners
notificationEvents.setMaxListeners(100);

export const NOTIFICATION_EVENT = "new_notification";
