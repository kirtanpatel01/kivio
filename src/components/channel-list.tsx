import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useChannelStore } from "#/stores/channel-store";

export default function ChannelList() {
  const {
    channels,
    selectedChannel,
    editingId,
    editingName,
    newChannelName,
    setNewChannelName,
    addChannel,
    selectChannel,
    startEdit,
    setEditingName,
    saveEdit,
    cancelEdit,
    deleteChannel,
    loading,
    error,
  } = useChannelStore();

  const handleAdd = async () => {
    if (loading) return;
    await addChannel(newChannelName);
  };

  return (
    <div className="w-full max-w-sm border-r border-border bg-secondary/5 flex flex-col h-full">
      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Input Area */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">
            Enter the channel's handle{" "}
            <span className="text-foreground/60">
              (the @handle visible on the channel's page)
            </span>
          </label>
          <div className="flex gap-2">
            <input
              className="w-full px-3 py-2 border border-border rounded-lg ring-2 ring-transparent focus:ring-primary/30 focus:outline-none focus:border-transparent transition-all duration-300 disabled:opacity-50"
              placeholder="@manuarora"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={loading}
            />
            <button
              onClick={handleAdd}
              disabled={loading}
              className="px-3 py-2 bg-secondary/70 hover:bg-secondary rounded-lg cursor-pointer transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[40px]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <IconPlus size={16} />
              )}
            </button>
          </div>
          {error && (
            <p className="text-xs text-primary/80 bg-primary/5 p-2 rounded border border-primary/20 animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          )}
        </div>

        {/* Channels List */}
        <div className="space-y-1">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedChannel?.id === channel.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-secondary/30 border border-transparent"
              }`}
              onClick={() => {
                if (editingId !== channel.id) selectChannel(channel);
              }}
            >
              {editingId === channel.id ? (
                <div className="flex flex-1 gap-2">
                  <input
                    className="w-full p-1 border border-primary/40 rounded-md ring-2 ring-transparent focus:ring-primary/50 focus:outline-none focus:border-transparent transition-all duration-300"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEdit();
                      }}
                      className="px-2 bg-secondary hover:bg-secondary/80 rounded-full cursor-pointer transition-all duration-300"
                    >
                      <IconCheck size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEdit();
                      }}
                      className="p-2 bg-primary/20 hover:bg-primary/30 rounded-full cursor-pointer transition-all duration-300"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium truncate">
                    {channel.name}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(channel);
                      }}
                      className="p-1.5 bg-secondary/70 hover:bg-secondary text-primary-foreground rounded-md cursor-pointer transition-all duration-300"
                    >
                      <IconPencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChannel(channel.id);
                      }}
                      className="p-1.5 bg-primary/40 hover:bg-primary/60 text-primary-foreground rounded-md cursor-pointer transition-all duration-300"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
