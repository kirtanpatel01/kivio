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
  errorComponent: ErrorState,
});

function ErrorState({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="size-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mb-2">
         <span className="text-2xl font-bold">!</span>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Error loading channels</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          {error?.message || "Verify your connection or authentication and try again."}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-8 py-2 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 cursor-pointer shadow-lg shadow-primary/10 transition-transform active:scale-95"
      >
        Try Again
      </button>
    </div>
  );
}

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

