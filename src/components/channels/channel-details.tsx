import {
  IconBrandYoutube,
  IconEye,
  IconInfoCircle,
  IconSearch,
  IconUsers,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import VideoCard from "#/components/video-card";
import { formatCount, formatDate } from "#/lib/utils";
import type {
  YouTubeChannelDetails,
  YouTubePlaylist,
  YouTubeVideo,
} from "#/types";

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

  const [searchQuery, setSearchQuery] = useState("");

  const setTab = (newTab: "videos" | "shorts" | "playlists") => {
    setSearchQuery(""); // Clear search when switching tabs
    navigate({
      search: { handle, tab: newTab },
    });
  };

  // Filter data based on tab AND search query
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (tab === "shorts") {
      const shorts = channelVideos.filter((v) => v.isShort);
      if (!q) return shorts;
      return shorts.filter((v) => v.title.toLowerCase().includes(q));
    }

    if (tab === "playlists") {
      if (!q) return playlists;
      return playlists.filter((p) => p.title.toLowerCase().includes(q));
    }

    // Default: Videos
    const vids = channelVideos.filter((v) => !v.isShort);
    if (!q) return vids;
    return vids.filter((v) => v.title.toLowerCase().includes(q));
  }, [tab, channelVideos, playlists, searchQuery]);

  const watchedSet = new Set(watchedIds);

  if (!handle) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
        <IconVideo size={48} strokeWidth={1.2} className="opacity-30" />
        <p className="text-sm">Select a channel to view its library</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
        <IconBrandYoutube size={48} strokeWidth={1.2} className="opacity-30" />
        <p className="text-sm">Resolving channel metadata...</p>
      </div>
    );
  }

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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

            {/* Contextual Search Bar */}
            <div className="relative flex-1 max-w-md group">
              <IconSearch
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder={`Search ${tab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/20 border border-border/40 rounded-xl py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all text-sm font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary/80 text-muted-foreground transition-colors"
                >
                  <IconX size={12} />
                </button>
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
          {filteredData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 py-16 text-center px-4">
              {searchQuery ? (
                <p className="text-sm font-medium text-foreground/80">
                  No {tab} found matching &quot;{searchQuery}&quot;
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground/80">
                    No {tab} found in this channel
                  </p>
                  {tab !== "playlists" && (
                    <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto line-clamp-2">
                      Videos appear here after they are synced. Use &quot;Sync
                      All Channels&quot; on the feed if needed.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tab === "playlists"
                ? (filteredData as YouTubePlaylist[]).map((playlist) => (
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
                          <span className="text-lg font-bold">
                            {playlist.itemCount}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest font-medium opacity-70">
                            Videos
                          </span>
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
                  ))
                : (filteredData as YouTubeVideo[]).map((video) => (
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
