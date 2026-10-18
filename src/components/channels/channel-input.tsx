import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
import { addUserChannel } from "#/actions/channels";

function ChannelInput() {
  const [newChannelName, setNewChannelName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const normalizeHandle = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  };

  const addChannelMutation = useMutation({
    mutationFn: (handle: string) => addUserChannel({ data: handle }),
    onSuccess: async (_, normalizedHandle) => {
      setNewChannelName("");
      await queryClient.invalidateQueries({ queryKey: ["userChannels"] });
      router.navigate({
        to: "/channels",
        search: { handle: normalizedHandle, tab: "videos" },
      });
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to add channel");
    },
  });

  const handleAdd = () => {
    const normalized = normalizeHandle(newChannelName);
    if (!normalized || addChannelMutation.isPending) return;
    setError(null);
    addChannelMutation.mutate(normalized);
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
          disabled={addChannelMutation.isPending}
        />
        <button
          onClick={handleAdd}
          disabled={addChannelMutation.isPending}
          className="px-3 py-2 bg-secondary/70 hover:bg-secondary rounded-lg cursor-pointer disabled:cursor-not-allowed flex items-center justify-center min-w-[40px]"
        >
          {addChannelMutation.isPending ? (
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
