import { create } from "zustand";
import { syncChannelNextBatch, syncChannelNow } from "#/actions/channels";
import { queryClient } from "#/lib/query";

export interface ChannelSyncStatus {
  isSyncing: boolean;
  syncedCount: number;
  totalVideos: number;
  isAllSynced: boolean;
  error: string | null;
  abortRequested: boolean;
}

interface SyncStore {
  channels: Record<string, ChannelSyncStatus>;

  // Initialize or update baseline stats from loader (safe against rolling back active counts)
  initChannelStats: (
    channelId: string,
    totalInDb: number,
    isAllSynced: boolean,
    totalVideos: number,
  ) => void;

  // Start background sync loop (continues across tab/route changes)
  startSyncAll: (
    channelId: string,
    handle: string,
    totalVideos: number,
  ) => Promise<void>;

  // Pause / abort sync loop
  stopSyncAll: (channelId: string) => void;

  // Single manual sync
  syncSingleNow: (channelId: string, handle: string) => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  channels: {},

  initChannelStats: (channelId, totalInDb, isAllSynced, totalVideos) => {
    set((state) => {
      const existing = state.channels[channelId];
      if (existing?.isSyncing) {
        // Sync is actively running in background! Never overwrite active progress.
        return state;
      }

      // Preserve higher count to prevent any backwards flickers from stale loaders
      const preservedCount = Math.max(existing?.syncedCount ?? 0, totalInDb);
      const isComplete =
        existing?.isAllSynced ||
        isAllSynced ||
        (totalVideos > 0 && preservedCount >= totalVideos);

      return {
        channels: {
          ...state.channels,
          [channelId]: {
            isSyncing: false,
            syncedCount: preservedCount,
            totalVideos: totalVideos || existing?.totalVideos || 0,
            isAllSynced: isComplete,
            error: null,
            abortRequested: false,
          },
        },
      };
    });
  },

  startSyncAll: async (channelId, handle, totalVideos) => {
    const current = get().channels[channelId];
    if (current?.isSyncing) return;

    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...(state.channels[channelId] || {
            syncedCount: 0,
            totalVideos,
            isAllSynced: false,
          }),
          isSyncing: true,
          abortRequested: false,
          error: null,
        },
      },
    }));

    try {
      while (true) {
        // Check if pause/stop was requested
        if (get().channels[channelId]?.abortRequested) {
          break;
        }

        const res = await syncChannelNextBatch({ data: channelId });

        const isComplete = res.isComplete || !res.nextPageToken;
        const newCount = res.totalInDb;

        set((state) => ({
          channels: {
            ...state.channels,
            [channelId]: {
              ...state.channels[channelId],
              syncedCount: newCount,
              isAllSynced: isComplete,
              isSyncing: !isComplete,
            },
          },
        }));

        if (isComplete) {
          break;
        }

        // 150ms delay between batches for rate limits and UI responsiveness
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      // Invalidate videos query so newly synced items show immediately
      if (handle) {
        await queryClient.invalidateQueries({
          queryKey: ["channel-videos", handle],
        });
      }
    } catch (err: unknown) {
      console.error("[SyncStore] Sync error:", err);
      const message =
        err instanceof Error ? err.message : "Sync encountered an error";
      set((state) => ({
        channels: {
          ...state.channels,
          [channelId]: {
            ...state.channels[channelId],
            isSyncing: false,
            error: message,
          },
        },
      }));
    } finally {
      set((state) => {
        const item = state.channels[channelId];
        if (!item) return state;
        return {
          channels: {
            ...state.channels,
            [channelId]: {
              ...item,
              isSyncing: false,
            },
          },
        };
      });
    }
  },

  stopSyncAll: (channelId) => {
    set((state) => {
      const existing = state.channels[channelId];
      if (!existing) return state;
      return {
        channels: {
          ...state.channels,
          [channelId]: {
            ...existing,
            abortRequested: true,
            isSyncing: false,
          },
        },
      };
    });
  },

  syncSingleNow: async (channelId, handle) => {
    try {
      await syncChannelNow({ data: channelId });
      if (handle) {
        await queryClient.invalidateQueries({
          queryKey: ["channel-videos", handle],
        });
      }
    } catch (err) {
      console.error("[SyncStore] Single sync error:", err);
      throw err;
    }
  },
}));
