import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import type { channels } from "#/db/schema";
import { useState } from "react";
import { fetchChannelByHandle } from "#/actions/channel";
import {
  getUserChannels,
  removeUserChannel,
  updateUserChannel,
} from "#/actions/channels";
import ChannelInput from "./channel-input";
import { getRouteApi } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Channel = typeof channels.$inferSelect;

const routeApi = getRouteApi("/channels");

export default function ChannelList({ channels }: { channels: Channel[] }) {
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { handle } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const { data: userChannels = channels } = useQuery<Channel[]>({
    queryKey: ["userChannels"],
    queryFn: () => getUserChannels(),
    initialData: channels,
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeUserChannel({ data: id }),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["userChannels"] });
      const previousChannels = queryClient.getQueryData<Channel[]>(["userChannels"]);
      queryClient.setQueryData<Channel[]>(["userChannels"], (old) =>
        old ? old.filter((c) => c.id !== deletedId) : [],
      );
      return { previousChannels };
    },
    onError: (_err, _id, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(["userChannels"], context.previousChannels);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, handle }: { id: string; handle: string }) => {
      await fetchChannelByHandle({ data: handle });
      return await updateUserChannel({ data: { id, handle } });
    },
    onMutate: async ({ id, handle: newHandle }) => {
      await queryClient.cancelQueries({ queryKey: ["userChannels"] });
      const previousChannels = queryClient.getQueryData<Channel[]>(["userChannels"]);
      queryClient.setQueryData<Channel[]>(["userChannels"], (old) =>
        old ? old.map((c) => (c.id === id ? { ...c, handle: newHandle } : c)) : [],
      );
      return { previousChannels };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData(["userChannels"], context.previousChannels);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
    },
  });

  const startEdit = (channel: Channel) => {
    setEditingId(channel.id);
    setEditingName(channel.handle);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const normalizeHandle = (value: string) =>
    value.trim().startsWith("@") ? value.trim() : `@${value.trim()}`;

  const handleSaveEdit = async () => {
    if (updateMutation.isPending || !editingId || !editingName.trim()) return;
    const normalized = normalizeHandle(editingName);
    try {
      await updateMutation.mutateAsync({ id: editingId, handle: normalized });
      handleCancelEdit();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleDelete = (channel: Channel) => {
    const remaining = (userChannels || []).filter((c) => c.id !== channel.id);
    if (handle === channel.handle) {
      navigate({
        search: (prev) => ({
          ...prev,
          handle: remaining[0]?.handle || undefined,
        }),
      });
    }
    deleteMutation.mutate(channel.id);
  };

  return (
    <div className="w-full max-w-sm border-r border-border bg-secondary/5 flex flex-col h-full">
      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Channels List */}
        <ChannelInput />
        <div className="space-y-1">
          {userChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-50">
              <p className="text-sm font-medium">No channels added yet.</p>
              <p className="text-xs text-muted-foreground">
                Add your first channel above to get started.
              </p>
            </div>
          ) : (
            userChannels.map((channel) => (
              <div
                key={channel.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                  handle === channel.handle
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-secondary/30 border border-transparent"
                }`}
                onClick={() => {
                  navigate({
                    search: (prev) => ({ ...prev, handle: channel.handle }),
                  });
                }}
              >
                {editingId === channel.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      className="w-full p-1 border border-primary/40 rounded-md ring-2 ring-transparent focus:ring-primary/50 focus:outline-none focus:border-transparent"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit();
                        }}
                        disabled={updateMutation.isPending}
                        className="px-2 bg-secondary hover:bg-secondary/80 rounded-full cursor-pointer disabled:opacity-50"
                      >
                        {updateMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : (
                          <IconCheck size={16} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        className="p-2 bg-primary/20 hover:bg-primary/30 rounded-full cursor-pointer"
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium truncate">
                      {channel.handle}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(channel);
                        }}
                        className="p-1.5 bg-secondary/70 hover:bg-secondary text-primary-foreground rounded-md cursor-pointer"
                      >
                        <IconPencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(channel);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 bg-primary/40 hover:bg-primary/60 text-primary-foreground rounded-md cursor-pointer disabled:opacity-50"
                      >
                        {deleteMutation.isPending && deleteMutation.variables === channel.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <IconTrash size={14} />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
