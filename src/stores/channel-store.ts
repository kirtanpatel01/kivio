import { create } from "zustand";
import {
  fetchChannelByHandle,
  type YouTubeChannelDetails,
} from "#/lib/youtube";

export interface Channel {
  id: string;
  name: string;
}

interface ChannelStore {
  // Channel list
  channels: Channel[];
  setChannels: (channels: Channel[]) => void;
  addChannel: (handle: string) => Promise<void>;
  deleteChannel: (id: string) => void;

  // Editing
  editingId: string | null;
  editingName: string;
  startEdit: (channel: Channel) => void;
  setEditingName: (name: string) => void;
  saveEdit: () => void;
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
  setChannels: (channels) => set({ channels }),
  addChannel: async (handle) => {
    const trimmed = handle.trim();
    if (!trimmed) return;

    const normalized = normalizeHandle(trimmed);
    const { channels } = get();

    // Avoid duplicates
    if (channels.some((c) => c.name.toLowerCase() === normalized.toLowerCase())) {
      set({ error: "Channel already in list", newChannelName: "" });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Verify channel exists before adding to list
      const details = await fetchChannelByHandle({ data: normalized });

      const updated = [
        ...get().channels,
        { id: Date.now().toString(), name: normalized },
      ];

      set({
        channels: updated,
        newChannelName: "",
        loading: false,
        // Optional: auto-select the newly added channel
        selectedChannel: updated[updated.length - 1],
        channelDetails: details,
      });

      localStorage.setItem("kivio-channels", JSON.stringify(updated));
    } catch (err: any) {
      set({
        error: err.message || "Could not find that channel",
        loading: false,
      });
    }
  },
  deleteChannel: (id) => {
    const { channels, selectedChannel } = get();
    const updated = channels.filter((c) => c.id !== id);
    const resetSelection = selectedChannel?.id === id;
    set({
      channels: updated,
      ...(resetSelection && {
        selectedChannel: null,
        channelDetails: null,
        error: null,
      }),
    });
    localStorage.setItem("kivio-channels", JSON.stringify(updated));
  },

  // Editing
  editingId: null,
  editingName: "",
  startEdit: (channel) =>
    set({ editingId: channel.id, editingName: channel.name }),
  setEditingName: (name) => set({ editingName: name }),
  saveEdit: () => {
    const { editingName, editingId, channels } = get();
    if (!editingName.trim()) return;
    const updated = channels.map((c) =>
      c.id === editingId ? { ...c, name: normalizeHandle(editingName) } : c,
    );
    set({ channels: updated, editingId: null });
    localStorage.setItem("kivio-channels", JSON.stringify(updated));
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
      set({ channelDetails: details, loading: false });
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch channel details",
        loading: false,
      });
    }
  },
}));

