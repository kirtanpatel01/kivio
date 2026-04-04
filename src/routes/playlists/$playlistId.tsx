import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchPlaylistById, fetchPlaylistVideos } from "#/actions/playlists";
import { fetchChannelById } from "#/actions/channel";
import VideoCard from "#/components/video-card";
import { IconPlaylist, IconChevronLeft } from "@tabler/icons-react";
import { formatDate } from "#/lib/utils";

export const Route = createFileRoute("/playlists/$playlistId")({
  // ... (omitting lines for brevity, actually I should include the replacement specifically)
  loader: async ({ params: { playlistId } }) => {
    const [playlist, videos] = await Promise.all([
      fetchPlaylistById({ data: playlistId }),
      fetchPlaylistVideos({ data: playlistId }),
    ]);

    if (!playlist) return { playlist: null, videos: [], channelAvatar: "" };

    const channel = await fetchChannelById({ data: playlist.channelId });
    const channelAvatar =
      channel?.thumbnails.medium?.url ?? channel?.thumbnails.default.url ?? "";

    const enrichedVideos = videos.map((v) => ({
      ...v,
      channelAvatar,
    }));

    return { playlist, videos: enrichedVideos, channelAvatar };
  },
  component: PlaylistPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">
      <h2 className="text-xl font-bold text-red-500">Error loading playlist</h2>
      <p className="text-muted-foreground mt-2">{(error as Error).message}</p>
    </div>
  ),
});

function PlaylistPage() {
  const { playlist, videos } = Route.useLoaderData();

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <IconPlaylist size={64} className="opacity-20" />
        <h1 className="text-2xl font-bold">Playlist not found</h1>
        <Link
          to="/channels"
          search={{ tab: "videos" }}
          className="text-primary hover:underline font-medium"
        >
          Go back to channels
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Playlist Header */}
      <header className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-sm px-4 py-6 sm:px-10">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <button
            onClick={() => window.history.back()}
            className="group flex items-center gap-1 pl-2 pr-4 py-2 rounded-full bg-secondary/60 hover:bg-secondary text-sm font-medium cursor-pointer transition-colors w-fit"
          >
            <IconChevronLeft
              size={18}
              className="group-hover:-translate-x-px"
            />
            Back
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative w-full md:w-80 aspect-video rounded-2xl overflow-hidden shadow-2xl shrink-0">
              <img
                src={playlist.thumbnail}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                <IconPlaylist size={48} className="text-white" />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <img
                    src={Route.useLoaderData().channelAvatar}
                    alt="Channel Avatar"
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 ring-2 ring-white/5"
                  />
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                    {playlist.title}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-x-4 text-xs sm:text-sm text-muted-foreground font-medium">
                  <span className="text-foreground font-bold">
                    {playlist.itemCount} videos
                  </span>
                  <span className="hidden sm:inline opacity-30">•</span>
                  <span>Last updated {formatDate(playlist.publishedAt)}</span>
                </div>
              </div>

              {playlist.description ? (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl line-clamp-3">
                  {playlist.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Video Grid */}
      <main className="flex-1 px-4 py-10 sm:px-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {videos.map((video) => (
              <Link
                key={video.id}
                to="/videos/$videoId"
                params={{ videoId: video.id }}
                search={{ playlistId: playlist.id }}
                className="hover:scale-[1.02] transition-transform duration-300"
              >
                <VideoCard video={video} />
              </Link>
            ))}
          </div>

          {videos.length === 0 && (
            <div className="text-center py-20 opacity-50">
              <p className="text-lg font-medium">
                No videos in this playlist yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
