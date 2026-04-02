import {
	IconBrandYoutube,
	IconEye,
	IconInfoCircle,
	IconUsers,
	IconVideo,
} from "@tabler/icons-react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import VideoCard from "#/components/video-card";
import { formatCount, formatDate } from "#/lib/utils";
import type { YouTubeChannelDetails, YouTubePlaylist, YouTubeVideo } from "#/types";

const routeApi = getRouteApi("/channels");

export default function ChannelDetails() {
	const { handle, tab } = routeApi.useSearch();
	const navigate = useNavigate({ from: "/channels" });
	const { details, channelVideos, playlists, watchedIds } =
		routeApi.useLoaderData() as {
			details: YouTubeChannelDetails | null;
			channelVideos: YouTubeVideo[];
			playlists: YouTubePlaylist[];
			watchedIds: string[];
		};

	const setTab = (newTab: "videos" | "shorts" | "playlists") => {
		navigate({
			search: { handle, tab: newTab },
		});
	};

	if (!handle) {
		return (
			<div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
				<IconBrandYoutube size={48} strokeWidth={1.2} className="opacity-30" />
				<p className="text-sm">Select a channel to view details</p>
			</div>
		);
	}

	if (!details) {
		return (
			<div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
				<IconVideo size={48} strokeWidth={1.2} className="opacity-30" />
				<p className="text-sm">Channel not found or data is unavailable</p>
			</div>
		);
	}

	const filteredVideos = channelVideos.filter((v) => {
		if (tab === "shorts") return v.isShort === true;
		return v.isShort !== true;
	});

	const watchedSet = new Set(watchedIds);

	return (
		<div className="flex flex-col min-h-full">
			{/* Compact header */}
			<header className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-sm px-4 py-3 sm:px-6">
				<div className="max-w-[1600px] mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
					<div className="flex items-center gap-3 min-w-0">
						<img
							src={details.thumbnails.high.url}
							alt=""
							className="size-14 sm:size-16 rounded-full border border-border/50 shrink-0 object-cover"
						/>
						<div className="min-w-0 flex-1">
							<h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
								{details.title}
							</h1>
							<p className="text-xs sm:text-sm text-muted-foreground truncate">
								{details.customUrl}
								{details.country ? (
									<span className="text-muted-foreground/70">
										{" "}
										· {details.country}
									</span>
								) : null}
							</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground sm:ml-auto">
						<span className="inline-flex items-center gap-1">
							<IconUsers size={14} className="opacity-70" />
							<span className="text-foreground font-medium">
								{formatCount(details.statistics.subscriberCount)}
							</span>
							<span className="hidden sm:inline">subs</span>
						</span>
						<span className="text-border hidden sm:inline">·</span>
						<span className="inline-flex items-center gap-1">
							<IconEye size={14} className="opacity-70" />
							<span className="text-foreground font-medium">
								{formatCount(details.statistics.viewCount)}
							</span>
							<span className="hidden sm:inline">views</span>
						</span>
						<span className="text-border hidden sm:inline">·</span>
						<span className="inline-flex items-center gap-1">
							<IconVideo size={14} className="opacity-70" />
							<span className="text-foreground font-medium">
								{formatCount(details.statistics.videoCount)}
							</span>
							<span className="hidden sm:inline">videos</span>
						</span>
						<span className="text-border hidden sm:inline">·</span>
						<span className="text-xs">
							Joined {formatDate(details.publishedAt)}
						</span>
					</div>
				</div>

				{details.description ? (
					<p className="max-w-[1600px] mx-auto mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 whitespace-pre-line">
						{details.description}
					</p>
				) : null}
			</header>

			{/* Videos from DB */}
			<section className="flex-1 px-4 py-6 sm:px-6">
				<div className="max-w-[1600px] mx-auto">
					<div className="flex items-center justify-between gap-3 flex-wrap mb-4">
						<div className="flex flex-col gap-1">
							<h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
								{tab === "shorts" 
									? "Shorts in Kivio" 
									: tab === "playlists"
									? "Playlists in Kivio"
									: "Videos in Kivio"}
							</h2>
							{tab === "playlists" && playlists.length > 0 && (
								<div className="flex items-center gap-1.5 text-[10px] text-primary/70 font-medium">
									<IconInfoCircle size={12} />
									<span>Video counts are cached for 24h</span>
								</div>
							)}
						</div>

						<div className="flex rounded-xl border border-border/60 bg-secondary/10 p-1 gap-1">
							<button
								type="button"
								onClick={() => setTab("videos")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
									tab === "videos"
										? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
										: "text-foreground/70 hover:bg-secondary/60"
								}`}
							>
								Videos
							</button>
							<button
								type="button"
								onClick={() => setTab("shorts")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
									tab === "shorts"
										? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
										: "text-foreground/70 hover:bg-secondary/60"
								}`}
							>
								Shorts
							</button>
							<button
								type="button"
								onClick={() => setTab("playlists")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
									tab === "playlists"
										? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
										: "text-foreground/70 hover:bg-secondary/60"
								}`}
							>
								Playlists
							</button>
						</div>
					</div>
					{tab === "playlists" ? (
						playlists.length === 0 ? (
							<div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 py-16 text-center px-4">
								<p className="text-sm font-medium text-foreground/80">No playlists found</p>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
								{playlists.map((playlist) => (
									<Link
										key={playlist.id}
										to="/playlists/$playlistId"
										params={{ playlistId: playlist.id }}
										className="w-full group cursor-pointer flex flex-col gap-3 hover:scale-[1.01] transition-transform duration-300"
									>
										<div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-secondary/20">
											<img
												src={playlist.thumbnail}
												alt={playlist.title}
												className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
											/>
											<div className="absolute inset-y-0 right-0 w-1/3 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white border-l border-white/10">
												<span className="text-lg font-bold">{playlist.itemCount}</span>
												<span className="text-[10px] uppercase tracking-widest font-medium opacity-70">Videos</span>
											</div>
										</div>
										<div className="px-1">
											<h3 className="text-sm sm:text-base font-bold line-clamp-2 leading-tight">
												{playlist.title}
											</h3>
											<p className="text-[10px] sm:text-xs text-foreground/40 font-medium mt-1">
												Created on {formatDate(playlist.publishedAt)}
											</p>
										</div>
									</Link>
								))}
							</div>
						)
					) : filteredVideos.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 py-16 text-center px-4">
							<p className="text-sm font-medium text-foreground/80">
								No videos stored yet
							</p>
							<p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
								Videos appear here after they are synced to your feed. Open the
								home feed and use &quot;Sync All Channels&quot; if you need to
								backfill.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
							{filteredVideos.map((video) => (
								<Link
									to="/videos/$videoId"
									params={{ videoId: video.id }}
									key={video.id}
									className="hover:scale-[1.01]"
								>
									<VideoCard
										video={video}
										isWatched={watchedSet.has(video.id)}
									/>
								</Link>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
