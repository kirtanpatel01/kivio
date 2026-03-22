import { createFileRoute } from "@tanstack/react-router";
import ChannelList from "#/components/channel-list";
import ChannelDetails from "#/components/channel-details";
import { IconLoader } from "@tabler/icons-react";
import { useChannelStore } from "#/stores/channel-store";
import { useEffect } from "react";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/channels")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session, isPending } = authClient.useSession();
  const loadChannels = useChannelStore(s => s.loadChannels);

  useEffect(() => {
    if (!isPending && session) {
      loadChannels();
    }
  }, [loadChannels, isPending, session]);

  if (isPending) {
    return (
      <div className="h-[calc(100vh-3rem)] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <IconLoader className="animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-[calc(100vh-3rem)] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <h2 className="text-2xl font-bold">Sign in to save channels</h2>
        <p className="text-muted-foreground max-w-md">
          You need to be logged in to manage your personalized list of YouTube
          channels and sync them across devices.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex overflow-hidden">
      <ChannelList />
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
        <ChannelDetails />
      </div>
    </div>
  );
}

