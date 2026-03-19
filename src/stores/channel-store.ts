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
  addChannel: (handle: string) => void;
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
  addChannel: (handle) => {
    if (!handle.trim()) return;
    const { channels } = get();
    const updated = [
      ...channels,
      { id: Date.now().toString(), name: normalizeHandle(handle) },
    ];
    set({ channels: updated, newChannelName: "" });
    localStorage.setItem("kivio-channels", JSON.stringify(updated));
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
