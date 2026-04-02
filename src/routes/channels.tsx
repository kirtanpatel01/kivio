import { IconLoader } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { getUserChannels, getVideosForChannelHandle } from "#/actions/channels";
import { getWatchedVideoIds } from "#/actions/history";
import { fetchChannelByHandle } from "#/actions/channel";
import ChannelDetails from "#/components/channels/channel-details";
import ChannelList from "#/components/channels/channel-list";
import UnauthorizedState from "#/components/UnauthorizedState";
import { authClient } from "#/lib/auth-client";

interface ChannelSearch {
	handle?: string;
}

export const Route = createFileRoute("/channels")({
	validateSearch: (search: Record<string, unknown>): ChannelSearch => {
		return {
			handle: (search.handle as string) || undefined,
		};
	},
	loaderDeps: ({ search: { handle } }) => ({ handle }),
	loader: async ({ deps: { handle } }) => {
		const channels = await getUserChannels();
		if (!handle) {
			return { channels, details: null, channelVideos: [], watchedIds: [] };
		}
		const [details, channelVideos, watchedIds] = await Promise.all([
			fetchChannelByHandle({ data: handle }),
			getVideosForChannelHandle({ data: handle }),
			getWatchedVideoIds(),
		]);
		return {
			channels,
			details,
			channelVideos,
			watchedIds: watchedIds ?? [],
		};
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

function ErrorState({ error }: { error: unknown }) {
	const message =
		error instanceof Error
			? error.message
			: "Failed to load channels. Please try again later.";
	return (
		<div className="p-10 flex justify-center">
			<p className="text-red-500 font-medium whitespace-pre-wrap">
				Error: {message}
			</p>
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
			<UnauthorizedState
				title="Sign in to save channels"
				description="You need to be logged in to manage your personalized list of YouTube channels and sync them across devices."
			/>
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
