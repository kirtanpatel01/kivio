import { IconLoader } from "@tabler/icons-react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getUserChannels, getVideosForChannelHandle } from "#/actions/channels";
import { getWatchedVideoIds } from "#/actions/history";
import { fetchChannelByHandle } from "#/actions/channel";
import { fetchPlaylistsByHandle } from "#/actions/playlists";
import ChannelDetails from "#/components/channels/channel-details";
import ChannelList from "#/components/channels/channel-list";
import UnauthorizedState from "#/components/UnauthorizedState";
import { authClient } from "#/lib/auth-client";


export const Route = createFileRoute("/channels")({
	validateSearch: (search) =>
		z
			.object({
				handle: z.string().optional(),
				tab: z.enum(["videos", "shorts", "playlists"])
					.optional()
					.default("videos"),
			})
			.parse(search),
	loaderDeps: ({ search: { handle, tab } }) => ({ handle, tab }),
	loader: async ({ deps: { handle, tab } }) => {
		const channels = await getUserChannels();

		if (!handle && channels.length > 0) {
			throw redirect({
				to: "/channels",
				search: {
					handle: channels[0]!.handle,
					tab,
				},
				replace: true,
			});
		}

		if (!handle) {
			return { channels, details: null, channelVideos: [], playlists: [], watchedIds: [] };
		}
		const [details, channelVideos, playlists, watchedIds] = await Promise.all([
			fetchChannelByHandle({ data: handle }),
			getVideosForChannelHandle({ data: handle }),
			fetchPlaylistsByHandle({ data: handle }),
			getWatchedVideoIds(),
		]);
		return {
			channels,
			details,
			channelVideos,
			playlists: playlists ?? [],
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
