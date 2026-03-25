import { createFileRoute } from "@tanstack/react-router";
import ChannelList from "#/components/channels/channel-list";
import ChannelDetails from "#/components/channels/channel-details";
import { IconLoader } from "@tabler/icons-react";
import { authClient } from "#/lib/auth-client";
import { getUserChannels } from "#/actions/channels";
import { fetchChannelByHandle } from "#/actions/youtube";

interface ChannelSearch {
  handle?: string;
}

export const Route = createFileRoute("/channels")({ 
  validateSearch: (search: Record<string, unknown>): ChannelSearch => {
    return {
      handle: (search.handle as string) || undefined,
    };
  },
  loaderDeps: ({ search: { handle } }) => ({handle}),
  loader: async ({ deps: { handle } }) => {
    const channels = await getUserChannels();
    let details = null;
    if(handle) {
      details = await fetchChannelByHandle({ data: handle });
    }
    return { channels, details };
  },
  head: ({ loaderData }) => ({
    title: loaderData?.details?.title 
      ? `${loaderData.details.title} | Kivio` 
      : "Channels | Kivio",
    meta: [],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session, isPending } = authClient.useSession();
  const { channels } = Route.useLoaderData();

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
      <ChannelList channels={channels} />
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
        <ChannelDetails />
      </div>
    </div>
  );
}

