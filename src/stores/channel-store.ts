import { create } from "zustand";
import {
  fetchChannelByHandle,
} from "#/actions/youtube";
import { type YouTubeChannelDetails } from "#/lib/youtube";
import {
  addUserChannel,
  getUserChannels,
  removeUserChannel,
  updateUserChannel,
} from "#/actions/channels";

export interface Channel {
  id: string;
  name: string;
}

interface ChannelStore {
  // Channel list
  channels: Channel[];
  setChannels: (channels: { id: string; handle: string }[]) => void;
  loadChannels: () => Promise<void>;
  addChannel: (handle: string) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;

  // Editing
  editingId: string | null;
  editingName: string;
  startEdit: (channel: Channel) => void;
  setEditingName: (name: string) => void;
  saveEdit: () => Promise<void>;
  cancelEdit: () => void;

  // Input
  newChannelName: string;
  setNewChannelName: (name: string) => void;

  // Selection & details
  selectedChannel: Channel | null;
  channelDetails: YouTubeChannelDetails | null;
  loading: boolean;
  error: string | null;
  selectChannel: (channel: Channel) => Promise<void>;
}

const normalizeHandle = (value: string) =>
  value.trim().startsWith("@") ? value.trim() : `@${value.trim()}`;

export const useChannelStore = create<ChannelStore>((set, get) => ({
  // Channel list
  channels: [],
  setChannels: (data) =>
    set({
      channels: data.map((d) => ({ id: d.id, name: d.handle })),
    }),
  loadChannels: async () => {
    set({ loading: true, error: null });
    try {
      const dbChannels = await getUserChannels();
      set({
        channels: dbChannels.map((c) => ({ id: c.id, name: c.handle })),
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to load channels", loading: false });
    }
  },
  addChannel: async (handle) => {
    const trimmed = handle.trim();
    if (!trimmed) return;

    const normalized = normalizeHandle(trimmed);
    const { channels } = get();

    // Avoid duplicates in the UI
    if (channels.some((c) => c.name.toLowerCase() === normalized.toLowerCase())) {
      set({ error: "Channel already in list", newChannelName: "" });
      return;
    }

    set({ loading: true, error: null });

    try {
      // 1. Verify channel exists on YouTube first
      const details = await fetchChannelByHandle({ data: normalized });
      if (!details) {
        throw new Error(`No channel found for handle "${normalized}"`);
      }

      // 2. Save it to user's database list
      const newDBChannel = await addUserChannel({ data: normalized });

      const newChannel: Channel = {
        id: newDBChannel.id,
        name: newDBChannel.handle,
      };

      set({
        channels: [newChannel, ...get().channels],
        newChannelName: "",
        loading: false,
        selectedChannel: newChannel,
        channelDetails: details,
      });
    } catch (err: any) {
      set({
        error: err.message || "Could not add that channel",
        loading: false,
      });
    }
  },
  deleteChannel: async (id) => {
    const { selectedChannel } = get();
    set({ loading: true, error: null });

    try {
      await removeUserChannel({ data: id });

      const updated = get().channels.filter((c) => c.id !== id);
      const resetSelection = selectedChannel?.id === id;

      set({
        channels: updated,
        loading: false,
        ...(resetSelection && {
          selectedChannel: null,
          channelDetails: null,
          error: null,
        }),
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to delete channel", loading: false });
    }
  },

  // Editing
  editingId: null,
  editingName: "",
  startEdit: (channel) =>
    set({ editingId: channel.id, editingName: channel.name }),
  setEditingName: (name) => set({ editingName: name }),
  saveEdit: async () => {
    const { editingName, editingId, channels } = get();
    if (!editingName.trim() || !editingId) return;

    const normalized = normalizeHandle(editingName);
    set({ loading: true, error: null });

    try {
      // 1. Verify handle on YouTube
      await fetchChannelByHandle({ data: normalized });

      // 2. Update in user's DB list
      await updateUserChannel({ data: { id: editingId, handle: normalized } });

      const updated = channels.map((c) =>
        c.id === editingId ? { ...c, name: normalized } : c,
      );

      set({ channels: updated, editingId: null, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to edit channel", loading: false });
    }
  },
  cancelEdit: () => set({ editingId: null }),

  // Input
  newChannelName: "",
  setNewChannelName: (name) => set({ newChannelName: name }),

  // Selection & details
  selectedChannel: null,
  channelDetails: null,
  loading: false,
  error: null,
  selectChannel: async (channel) => {
    set({
      selectedChannel: channel,
      loading: true,
      error: null,
      channelDetails: null,
    });

    try {
      const details = await fetchChannelByHandle({ data: channel.name });
      if (details === null) {
        set({ channelDetails: null, loading: false });
      } else {
        set({ channelDetails: details, loading: false });
      }
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch channel details",
        loading: false,
      });
    }
  },
}));


