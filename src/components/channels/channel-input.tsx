import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { IconPlus } from "@tabler/icons-react";
import { addUserChannel } from "#/actions/channels";
import { fetchChannelByHandle } from "#/actions/channel";

function ChannelInput() {
  const [newChannelName, setNewChannelName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const normalizeHandle = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  };

  const handleAdd = async () => {
    const normalized = normalizeHandle(newChannelName);
    if (!normalized) return;
    try {
      setAdding(true);
      setError(null);
      // 2. Call the verification and the DB save
      await fetchChannelByHandle({ data: normalized });
      await addUserChannel({ data: normalized });

      setNewChannelName("");
      router.invalidate(); // Refresh!
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to add channel");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted-foreground">
        Enter the channel's handle{" "}
        <span className="text-foreground/60">
          (the @handle visible on the channel's page)
        </span>
      </label>
      <div className="flex gap-2">
        <input
          className="w-full px-3 py-2 border border-border rounded-lg ring-2 ring-transparent focus:ring-primary/30 focus:outline-none focus:border-transparent disabled:opacity-50"
          placeholder="@manuarora"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          disabled={adding}
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-3 py-2 bg-secondary/70 hover:bg-secondary rounded-lg cursor-pointer disabled:cursor-not-allowed flex items-center justify-center min-w-[40px]"
        >
          {adding ? (
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
  );
}

export default ChannelInput;
