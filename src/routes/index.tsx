import VideoCard from "#/components/video-card";
import Avatar from "#/components/Avatar";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { fetchFeedForUser } from "#/actions/feed";
import { getUserChannels } from "#/actions/channels";
import { getWatchedVideoIds } from "#/actions/history";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import {
  IconLoader,
  IconSearch,
  IconX,
  IconBrandYoutube,
} from "@tabler/icons-react";

export const Route = createFileRoute("/")({
  validateSearch: (search) =>
    z
      .object({
        q: z.string().optional(),
      })
      .parse(search),
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: async ({ deps: { q } }) => {
    try {
      const [feed, watchedIds, followedChannels] = await Promise.all([
        fetchFeedForUser({ data: { q } }),
        getWatchedVideoIds(),
        getUserChannels(),
      ]);
      return {
        videos: feed?.videos || [],
        hasMore: feed?.hasMore || false,
        watchedIds: watchedIds || [],
        followedChannels: followedChannels || [],
        q: q || "",
      };
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        throw e;
      }
      throw e;
    }
  },
  head: () => ({
    title: "Feed | Kivio",
    meta: [],
  }),
  component: Dashboard,
  errorComponent: ErrorState,
});

function ErrorState({ error }: { error: any }) {
  return (
    <div className="p-10 flex justify-center">
      <p className="text-red-500 font-medium">
        Error:{" "}
        {error?.message || "Failed to load feed. Please try again later."}
      </p>
    </div>
  );
}

function Dashboard() {
  const {
    videos: initialVideos,
    hasMore: initialHasMore,
    watchedIds,
    q: initialQ,
    followedChannels,
  } = Route.useLoaderData();

  const navigate = useNavigate({ from: "/" });
  const observerTarget = useRef<HTMLDivElement>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);

  // Update URL search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      navigate({
        search: (prev) => ({ ...prev, q: searchQuery || undefined }),
        replace: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, navigate]);

  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "feed",
      {
        channelIds: selectedChannelIds.slice().sort(),
        q: debouncedQuery,
      },
    ],
    queryFn: async ({ pageParam = 0 }) => {
      return await fetchFeedForUser({
        data: {
          page: pageParam,
          q: debouncedQuery || undefined,
          channelIds:
            selectedChannelIds.length > 0 ? selectedChannelIds : undefined,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !lastPage.hasMore) return undefined;
      return allPages.length;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    initialData:
      selectedChannelIds.length === 0 && debouncedQuery === initialQ && initialVideos?.length
        ? {
            pages: [
              {
                videos: initialVideos,
                hasMore: initialHasMore,
              },
            ],
            pageParams: [0],
          }
        : undefined,
  });

  const videos = useMemo(() => {
    if (feedData?.pages) {
      return feedData.pages.flatMap((page) => page.videos);
    }
    return initialVideos;
  }, [feedData, initialVideos]);

  const toggleChannel = (id: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleResetChannels = () => {
    setSelectedChannelIds([]);
  };

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || videos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasNextPage, isFetchingNextPage, videos.length]);

  // If the user has NOT followed any channels yet (True Subscription Check)
  if (!followedChannels || followedChannels.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center gap-4 px-6 animate-in fade-in slide-in-from-bottom-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Your library is empty</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Follow channels to start building your personal, synced feed.
          </p>
        </div>
        <Link
          to="/channels"
          search={{ tab: "videos" }}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
        >
          Follow your first channel
        </Link>
      </div>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] max-w-[1600px] mx-auto px-4 md:px-0">
      {/* Fixed Sidebar Filter */}
      <aside className="hidden md:flex flex-col w-72 h-[calc(100vh-4rem)] sticky top-0 border-r border-border/50 p-4 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Channels
          </h2>
          {selectedChannelIds.length > 0 && (
            <button
              onClick={handleResetChannels}
              className="text-[10px] font-bold text-primary/80 tracking-wider hover:text-primary cursor-pointer transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
          <button
            onClick={handleResetChannels}
            className={`flex items-center p-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
              selectedChannelIds.length === 0
                ? "bg-primary/80 hover:bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-transparent border-transparent text-foreground/80 hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            All Channels
          </button>

          {followedChannels.map((uc: any) => {
            const yc = uc.youtubeChannel;
            if (!yc) return null;

            return (
              <button
                key={yc.channelId}
                onClick={() => toggleChannel(yc.channelId)}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  selectedChannelIds.includes(yc.channelId)
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Avatar
                  src={yc.thumbnailMedium || yc.thumbnailDefault}
                  name={yc.title}
                  className="size-8 rounded-full border border-border/20 shadow-sm shrink-0 object-cover"
                />
                <span className="truncate">{yc.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Grid Content */}
      <div className="flex-1 p-4 md:p-8">
        {/* Search Bar & Global YT Search */}
        <div className="max-w-3xl mb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Prominently Highlighted Local Library Search */}
          <div className="relative flex-1 group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              <IconSearch
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
                size={18}
              />
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Library
              </span>
            </div>
            <input
              type="text"
              placeholder="Search within your synced library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/20 border border-border/50 rounded-2xl py-3 pl-11 sm:pl-28 pr-10 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all text-sm font-medium placeholder:text-muted-foreground/60 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Clear search"
              >
                <IconX size={16} />
              </button>
            )}
          </div>

          {/* Small Global YT Search Button */}
          <Link
            to="/search"
            search={{ q: searchQuery || undefined }}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all shrink-0 active:scale-95 shadow-sm"
            title="Search all of YouTube (coming soon)"
          >
            <IconBrandYoutube size={17} className="text-red-500 shrink-0" />
            <span>Global YT Search</span>
          </Link>
        </div>

        {videos.length === 0 ? (
          <div className="h-[40vh] flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in fade-out duration-300">
            <div className="size-16 rounded-full bg-secondary/20 flex items-center justify-center">
              <IconSearch size={24} className="text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold">No data found</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                We couldn't find any data matching &quot;
                <span className="text-foreground font-semibold">
                  {searchQuery}
                </span>
                &quot; in your synced videos.
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-bold text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {videos.map((video: any) => (
              <Link
                to={`/videos/$videoId`}
                params={{ videoId: video.id }}
                key={video.id}
                className="hover:scale-[1.01] transition-transform"
              >
                <VideoCard
                  video={video}
                  isWatched={watchedIds.includes(video.id)}
                />
              </Link>
            ))}
          </div>
        )}

        {/* Observer Target & Loading State */}
        <div
          ref={observerTarget}
          className="w-full py-12 flex items-center justify-center"
          style={{ opacity: hasNextPage ? 1 : 0 }}
        >
          {isFetchingNextPage && (
            <div className="flex items-center gap-3 text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
              <IconLoader className="animate-spin" size={20} />
              <span className="text-sm font-medium">
                Loading more videos...
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
