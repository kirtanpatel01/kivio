import { createFileRoute } from "@tanstack/react-router";
import { fetchShortsForUser } from "#/actions/youtube";
import ShortVideo from "#/components/short-video";
import { useEffect, useRef, useState, useCallback } from "react";
import { IconLoader, IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import { z } from "zod";

const shortsSearchSchema = z.object({
  v: z.string().optional(),
});

export const Route = createFileRoute("/shorts")({
  validateSearch: (search) => shortsSearchSchema.parse(search),
  loaderDeps: ({ search: { v } }) => ({ v }),
  loader: async ({ deps: { v } }) => {
    const feed = await fetchShortsForUser({ data: { currentVideoId: v } });
    return {
      videos: feed?.videos || [],
      hasMore: feed?.hasMore || false,
      initialVideoId: v,
    };
  },
  component: ShortsPage,
});

function ShortsPage() {
  const loaderData = Route.useLoaderData();
  const initialVideos = loaderData?.videos || [];
  const { v: currentVideoId } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [videos, setVideos] = useState(initialVideos);
  const [hasMore, setHasMore] = useState(loaderData?.hasMore || false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (currentVideoId) return currentVideoId;
    if (initialVideos.length > 0 && initialVideos[0]) return initialVideos[0].id;
    return null;
  });

  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;

    setIsFetchingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchShortsForUser({ data: { page: nextPage } });
      if (result && result.videos.length > 0) {
        setVideos((prev) => [...prev, ...result.videos]);
        setPage(nextPage);
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[Shorts] Error loading more:", err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [page, hasMore, isFetchingMore]);

  // Handle URL changes (e.g. from back/forward buttons)
  useEffect(() => {
    if (currentVideoId && currentVideoId !== activeId) {
      setActiveId(currentVideoId);
      // Scroll the container to the right video if needed
      const element = document.getElementById(`video-${currentVideoId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentVideoId]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
            loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loadMore]);

  // Active Video Observer (to update URL as we scroll)
  useEffect(() => {
    const options = {
      root: containerRef.current,
      threshold: 0.8, // Must be 80% visible to be considered active
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const videoId = entry.target.getAttribute("data-video-id") ?? undefined;
          if (videoId && videoId !== activeId) {
            setActiveId(videoId);
            navigate({ search: { v: videoId }, replace: true });
          }
        }
      }
    }, options);

    const videoElements = document.querySelectorAll("[data-video-id]");
    videoElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos, activeId, navigate]);

  const handleScrollManual = (direction: 'up' | 'down') => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const currentScroll = container.scrollTop;
    const itemHeight = container.clientHeight;
    
    const newScroll = direction === 'up' 
      ? currentScroll - itemHeight 
      : currentScroll + itemHeight;
      
    container.scrollTo({ top: newScroll, behavior: 'smooth' });
  };

  if (videos.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center gap-4 px-6">
        <h2 className="text-2xl font-bold">No shorts found</h2>
        <p className="text-muted-foreground">Add more channels to see shorts here.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Scroll Controls (Right Side) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
        <button
          onClick={() => handleScrollManual('up')}
          className="size-12 rounded-full bg-secondary/80 backdrop-blur-md border border-border/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all shadow-xl active:scale-95 cursor-pointer"
          title="Previous Video"
        >
          <IconChevronUp size={28} stroke={2.5} />
        </button>
        <button
          onClick={() => handleScrollManual('down')}
          className="size-12 rounded-full bg-secondary/80 backdrop-blur-md border border-border/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all shadow-xl active:scale-95 cursor-pointer"
          title="Next Video"
        >
          <IconChevronDown size={28} stroke={2.5} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory custom-scrollbar"
      >
        {videos.map((video) => (
          <div 
            key={video.id} 
            id={`video-${video.id}`}
            data-video-id={video.id}
            className="snap-start"
          >
            <ShortVideo 
              video={video} 
              isActive={activeId === video.id} 
            />
          </div>
        ))}

        {/* Load More Trigger */}
        <div 
          ref={observerTarget}
          className="h-20 flex items-center justify-center"
        >
          {isFetchingMore && (
             <IconLoader className="animate-spin text-primary" size={32} />
          )}
        </div>
      </div>
    </div>
  );
}
