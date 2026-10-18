import {
  IconBrandYoutube,
  IconCheck,
  IconCloudDownload,
  IconEye,
  IconInfoCircle,
  IconLoader,
  IconRefresh,
  IconSearch,
  IconUsers,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import {
  getRouteApi,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  useInfiniteQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { motion } from "motion/react";
import VideoCard from "#/components/video-card";
import Avatar from "#/components/Avatar";
import VideoThumbnail from "#/components/VideoThumbnail";
import { formatCount, formatDate } from "#/lib/utils";
import { getVideosForChannelHandle } from "#/actions/channels";
import { useSyncStore } from "#/stores/sync-store";
import type {
  YouTubeChannelDetails,
  YouTubePlaylist,
  YouTubeVideo,
} from "#/types";

const routeApi = getRouteApi("/channels");

export default function ChannelDetails() {
  const { handle, tab } = routeApi.useSearch();
  const navigate = useNavigate({ from: "/channels" });
  const { details, channelVideos, initialHasMore, initialTotalInDb, initialIsAllSynced, playlists, watchedIds } =
    routeApi.useLoaderData() as {
      details: YouTubeChannelDetails | null;
      channelVideos: YouTubeVideo[];
      initialHasMore?: boolean;
      initialTotalInDb?: number;
      initialIsAllSynced?: boolean;
      playlists: YouTubePlaylist[];
      watchedIds: string[];
    };

  const router = useRouter();
  const channelId = details?.id;
  const totalVideos = parseInt(details?.statistics?.videoCount || "0", 10) || 0;

  // Global Zustand sync state (persists across tab switching and component remounts)
  const syncStatus = useSyncStore((s) => (channelId ? s.channels[channelId] : undefined));
  const initChannelStats = useSyncStore((s) => s.initChannelStats);
  const startSyncAll = useSyncStore((s) => s.startSyncAll);
  const stopSyncAll = useSyncStore((s) => s.stopSyncAll);
  const syncSingleNow = useSyncStore((s) => s.syncSingleNow);
  const [isSyncingSingle, setIsSyncingSingle] = useState(false);
  const isSyncing = isSyncingSingle;

  // Initialize store baseline safely when channel or initialTotalInDb changes
  // (initChannelStats safely ignores updates if a sync is actively running)
  useEffect(() => {
    if (channelId && initialTotalInDb !== undefined) {
      initChannelStats(channelId, initialTotalInDb, initialIsAllSynced ?? false, totalVideos);
    }
  }, [channelId, initialTotalInDb, initialIsAllSynced, totalVideos, initChannelStats]);

  // Derived sync stats directly from store (or loader initial baseline if store not yet populated)
  const syncedCount = syncStatus?.syncedCount ?? initialTotalInDb ?? (channelVideos?.length ?? 0);
  const isSyncingAll = syncStatus?.isSyncing ?? false;
  const isAllSyncedState =
    (syncStatus?.isAllSynced ?? initialIsAllSynced ?? false) ||
    (totalVideos > 0 && syncedCount >= totalVideos);

  const observerTarget = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite query for channel videos across tabs with caching
  const {
    data: videosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["channel-videos", handle, tab, debouncedQuery],
    queryFn: async ({ pageParam = 0 }) => {
      return await getVideosForChannelHandle({
        data: {
          handle: handle!,
          isShort: tab === "shorts",
          offset: pageParam,
          limit: 50,
          q: debouncedQuery || undefined,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !lastPage.hasMore) return undefined;
      const loadedCount = allPages.flatMap((p) => p.videos).length;
      return loadedCount;
    },
    enabled: !!handle && tab !== "playlists",
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    initialData:
      tab !== "playlists" && !debouncedQuery && channelVideos?.length
        ? {
            pages: [
              {
                videos: channelVideos,
                hasMore: initialHasMore ?? false,
                totalInDb: initialTotalInDb ?? 0,
              },
            ],
            pageParams: [0],
          }
        : undefined,
  });

  const videos = useMemo(() => {
    if (tab === "playlists") return [];
    if (videosData?.pages) {
      return videosData.pages.flatMap((page) => page.videos);
    }
    return channelVideos ?? [];
  }, [videosData, channelVideos, tab]);


  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && tab !== "playlists" && !!handle) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, tab, handle, fetchNextPage]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || tab === "playlists") return;

    // 1. Intersection Observer with threshold 0 and rootMargin to trigger before hitting the bottom
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0, rootMargin: "300px" },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    // 2. Direct scroll listener on scroll container (.overflow-y-auto)
    const container = observerTarget.current?.closest(".overflow-y-auto");
    const onScroll = () => {
      if (!container) return;
      const scrollBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (scrollBottom < 400) {
        loadMore();
      }
    };

    if (container) {
      container.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      observer.disconnect();
      if (container) {
        container.removeEventListener("scroll", onScroll);
      }
    };
  }, [loadMore, hasNextPage, isFetchingNextPage, tab]);

  const handleSync = async () => {
    if (!channelId || isSyncingSingle || isSyncingAll) return;
    try {
      setIsSyncingSingle(true);
      await syncSingleNow(channelId, handle || "");
      await router.invalidate();
    } catch (err) {
      console.error("[ChannelDetails] Sync failed:", err);
    } finally {
      setIsSyncingSingle(false);
    }
  };

  const handleSyncAll = () => {
    if (!channelId || isSyncingAll || !handle) return;
    startSyncAll(channelId, handle, totalVideos);
  };

  const handleStopSyncAll = () => {
    if (!channelId) return;
    stopSyncAll(channelId);
  };

  const setTab = (newTab: "videos" | "shorts" | "playlists") => {
    setSearchQuery(""); // Clear search when switching tabs
    navigate({
      search: { handle, tab: newTab },
    });
  };

  // Filter data based on tab AND search query
  const filteredData = useMemo(() => {
    if (tab === "playlists") {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return playlists;
      return playlists.filter((p) => p.title.toLowerCase().includes(q));
    }

    if (tab === "shorts") {
      return videos.filter((v) => v.isShort);
    }

    return videos.filter((v) => !v.isShort);
  }, [tab, videos, playlists, searchQuery]);

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
            <Avatar
              src={
                details.thumbnails.high?.url ||
                details.thumbnails.medium?.url ||
                details.thumbnails.default?.url
              }
              name={details.title}
              className="size-14 sm:size-16 rounded-full border border-border/50 shrink-0 object-cover text-lg font-bold"
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

          <div className="flex flex-col sm:items-end gap-2 sm:ml-auto">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
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

            {/* Compact Sync All / Progress Bar Area directly below stats */}
            {(() => {
              const totalVideos = parseInt(details.statistics.videoCount, 10) || 0;
              const remaining = Math.max(0, totalVideos - syncedCount);
              const isAllSynced = isAllSyncedState || (totalVideos > 0 && remaining === 0);
              const progressPercent =
                totalVideos > 0
                  ? Math.min(100, Math.round((syncedCount / totalVideos) * 100))
                  : 100;

              return (
                <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
                  {isAllSynced ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-semibold">
                      <IconCheck size={12} stroke={2.5} />
                      <span>All {syncedCount} videos synced</span>
                    </div>
                  ) : isSyncingAll ? (
                    <div className="flex flex-col sm:items-end gap-1 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs font-medium">
                        <span className="text-muted-foreground text-[11px]">
                          Syncing... <span className="font-bold text-foreground">{syncedCount}</span> / {totalVideos} ({remaining} remaining)
                        </span>
                        <button
                          onClick={handleStopSyncAll}
                          className="text-[10px] text-muted-foreground hover:text-red-400 font-semibold underline cursor-pointer"
                          title="Pause background sync"
                        >
                          Pause
                        </button>
                      </div>
                      <div className="w-full sm:w-56 h-1.5 bg-secondary/60 rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between sm:justify-end gap-2.5">
                      <span className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{syncedCount}</span> / {totalVideos} synced
                        {remaining > 0 ? ` (${remaining} remaining)` : ""}
                      </span>
                      <button
                        onClick={handleSyncAll}
                        disabled={isSyncingAll || isSyncing}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        title={isSyncingAll || isSyncing ? "Syncing is in progress..." : "Sync all channel videos in background batches"}
                      >
                        {isSyncingAll || isSyncing ? (
                          <IconRefresh size={13} className="animate-spin" />
                        ) : (
                          <IconCloudDownload size={13} stroke={2} />
                        )}
                        <span>{isSyncingAll ? "Syncing..." : isSyncing ? "Syncing..." : "Sync All"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
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

            <div className="flex rounded-xl border border-border/60 bg-secondary/15 p-1 gap-1 relative">
              {(["videos", "shorts", "playlists"] as const).map((tabKey) => {
                const isActive = tab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setTab(tabKey)}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors capitalize z-10 cursor-pointer ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="channel-tab-pill"
                        className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm shadow-primary/25"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {tabKey}
                  </button>
                );
              })}
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
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Sync the latest 50 videos from YouTube into your
                        library.
                      </p>
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <IconRefresh
                          size={14}
                          className={isSyncing ? "animate-spin" : ""}
                        />
                        {isSyncing
                          ? "Syncing latest videos..."
                          : "Sync Channel Videos"}
                      </button>
                    </div>
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
                        <VideoThumbnail
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
                      className="block"
                    >
                      <VideoCard
                        video={video}
                        isWatched={watchedSet.has(video.id)}
                      />
                    </Link>
                  ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel & Loading Indicator */}
          {tab !== "playlists" && (
            <div
              ref={observerTarget}
              className="w-full py-12 flex flex-col items-center justify-center gap-2"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2.5 text-muted-foreground animate-in fade-in">
                  <IconLoader className="animate-spin text-primary" size={20} />
                  <span className="text-sm font-medium">
                    Loading more videos...
                  </span>
                </div>
              ) : hasNextPage ? (
                <button
                  onClick={loadMore}
                  disabled={isFetchingNextPage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-primary/20"
                >
                  <IconRefresh size={14} />
                  <span>Load more videos</span>
                </button>
              ) : videos.length > 0 ? (
                <p className="text-xs text-muted-foreground/50 font-medium">
                  Showing all {videos.length} videos
                </p>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
