import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/channels")({
  component: RouteComponent,
});

interface Channel {
  id: string;
  name: string;
}

function RouteComponent() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("kivio-channels");
    if (saved) {
      setChannels(JSON.parse(saved));
    } else {
      setChannels([
        { id: "1", name: "Channel 1" },
        { id: "2", name: "Channel 2" },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kivio-channels", JSON.stringify(channels));
  }, [channels]);

  const addChannel = () => {
    if (!newChannelName.trim()) return;
    setChannels([...channels, { id: Date.now().toString(), name: newChannelName.trim() }]);
    setNewChannelName("");
  };

  const deleteChannel = (id: string) => {
    setChannels(channels.filter((c) => c.id !== id));
  };

  const saveEdit = () => {
    if (!editingName.trim()) return;
    setChannels(channels.map((c) => (c.id === editingId ? { ...c, name: editingName.trim() } : c)));
    setEditingId(null);
  };

  console.log(channels)

  return (
    <div className="min-h-[calc(100vh-3rem)]">
      <div className="w-full h-[calc(100vh-3rem)] max-w-xl mx-auto bg-secondary/15 p-4 space-y-6 text-foreground">
        <h1 className="text-xl font-bold">Channels</h1>
        {/* Input Area */}
        <div className="flex gap-2">
          <input
            className="w-full px-3 py-2 border border-border rounded-lg ring-2 ring-transparent focus:ring-primary/30 focus:outline-none focus:border-transparent transition-all duration-300"
            placeholder="@manuarora"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addChannel()}
          />
          <button 
            onClick={addChannel}
            className="px-3 py-2 bg-secondary/70 hover:bg-secondary rounded-lg cursor-pointer transition-all duration-300"
          >
            <IconPlus size={16} />{" "}
          </button>
        </div>
        {/* Channels List */}
        <div className="space-y-1">
          {channels.map((channel) => (
            <div key={channel.id} className="flex items-center justify-between p-2">
              {editingId === channel.id ? (
                <div className="flex flex-1 gap-2">
                  <input
                    className="w-full p-1 border border-primary/40 rounded-md ring-2 ring-transparent focus:ring-primary/50 focus:outline-none focus:border-transparent transition-all duration-300"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button onClick={saveEdit} className="px-2 bg-secondary hover:bg-secondary/80 rounded-full cursor-pointer transition-all duration-300">
                      <IconCheck size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-primary/20 hover:bg-primary/30 rounded-full cursor-pointer transition-all duration-300">
                      <IconX size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span>{channel.name}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingId(channel.id);
                        setEditingName(channel.name);
                      }}
                      className="p-2 bg-secondary/70 hover:bg-secondary text-primary-foreground rounded-md cursor-pointer transition-all duration-300"
                    >
                      <IconPencil size={16} />{" "}
                    </button>
                    <button 
                      onClick={() => deleteChannel(channel.id)}
                      className="p-2 bg-primary/40 hover:bg-primary/60 text-primary-foreground rounded-md cursor-pointer transition-all duration-300"
                    >
                      <IconTrash size={16} />{" "}
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

