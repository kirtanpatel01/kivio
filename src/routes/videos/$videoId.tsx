import { fetchVideoDetails, getSuggestedVideos } from "#/actions/videos";
import { getWatchedVideoIds } from "#/actions/history";
import type { YouTubeVideo, YouTubePlaylist } from "#/types";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { fetchPlaylistById, fetchPlaylistVideos } from "#/actions/playlists";
import { z } from "zod";

export const Route = createFileRoute("/videos/$videoId")({
  validateSearch: (search) =>
    z
      .object({
        playlistId: z.string().optional(),
      })
      .parse(search),
  loaderDeps: ({ search: { playlistId } }) => ({ playlistId }),
  loader: async ({ params: { videoId }, deps: { playlistId } }) => {
    const [video, watchedIds] = await Promise.all([
      fetchVideoDetails({ data: videoId }),
      getWatchedVideoIds(),
    ]);

    if (!video)
      return {
        video: null,
        suggestions: [],
        watchedIds: watchedIds || [],
        playlist: null,
        playlistVideos: [],
      };

    // Fetch suggestions from our local database instead of YouTube API
    const suggestions = video.channelId
      ? await getSuggestedVideos({ data: { channelId: video.channelId } })
      : [];

    let playlistData: YouTubePlaylist | null = null;
    let playlistVideos: YouTubeVideo[] = [];

    if (playlistId) {
      const [p, v] = await Promise.all([
        fetchPlaylistById({ data: playlistId }),
        fetchPlaylistVideos({ data: playlistId }),
      ]);
      playlistData = p;
      playlistVideos = v;
    }

    return {
      video,
      suggestions: suggestions || [],
      watchedIds: watchedIds || [],
      playlist: playlistData,
      playlistVideos,
    };
  },
  head: ({ loaderData }) => ({
    title: loaderData?.video?.title
      ? `${loaderData.video.title} | Kivio`
      : "Video | Kivio",
    meta: [
      {
        name: "description",
        content:
          loaderData?.video?.description?.slice(0, 160) ||
          "Watch this video on Kivio.",
      },
      {
        property: "og:image",
        content: loaderData?.video?.thumbnail,
      },
    ],
  }),
  component: RouteComponent,
  errorComponent: ErrorState,
});

function ErrorState({ error }: { error: any }) {
  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-red-500 font-medium">
        Playback Error: {error?.message || "Could not load video."}
      </p>
    </div>
  );
}

import VideoPlayer from "#/components/video/VideoPlayer";
import VideoDetails from "#/components/video/VideoDetails";
import Sidebar from "#/components/video/Sidebar";

function RouteComponent() {
  const { video, suggestions, watchedIds, playlist, playlistVideos } =
    Route.useLoaderData();

  const filteredSuggestions = useMemo(() => {
    return (suggestions as YouTubeVideo[]).filter((v) => v.id !== video?.id);
  }, [suggestions, video?.id]);

  if (!video) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold">Video not found</h2>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex overflow-hidden bg-background">
      {/* LEFT SECTION: Player & Details (Scrollable) */}
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar border-r border-border">
        <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4">
          <VideoPlayer videoId={video.id} title={video.title} />
          <VideoDetails video={video} />
        </div>
      </div>

      {/* RIGHT SECTION: Sidebar (Playlist & Suggestions) */}
      <Sidebar
        currentVideoId={video.id}
        playlist={playlist}
        playlistVideos={playlistVideos}
        suggestions={filteredSuggestions}
        watchedIds={watchedIds}
      />
    </div>
  );
}
