import VideoCard from '#/components/video-card'
import { createFileRoute, Link } from '@tanstack/react-router'
import { fetchFeedForUser } from '#/actions/youtube'
import { getWatchedVideoIds } from '#/actions/history'
import type { YouTubeVideo } from '#/types'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { IconLoader } from '@tabler/icons-react'
import UnauthorizedState from '#/components/UnauthorizedState'

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const [feed, watchedIds] = await Promise.all([
        fetchFeedForUser(),
        getWatchedVideoIds()
      ])
      return { 
        videos: feed?.videos || [], 
        nextPageTokens: feed?.nextPageTokens || {},
        watchedIds: watchedIds || []
      }
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        throw e; // Let the errorComponent handle it specifically
      }
      throw e;
    }
  },
  head: () => ({
    title: 'Feed | Kivio',
    meta: []
  }),
  component: Dashboard,
  errorComponent: ErrorState,
})

function ErrorState({ error, reset }: { error: any; reset: () => void }) {
  const isUnauthorized = error?.message === "Unauthorized" || error?.status === 401;

  if (isUnauthorized) {
    return (
      <UnauthorizedState 
        title="Your Personal Feed"
        description="Sign in to Kivio to manage your favorite channels, track your watch history, and see a personalized video feed."
      />
    );
  }

  return (
    <div className="h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="size-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mb-2">
         <span className="text-2xl font-bold">!</span>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Failed to load feed</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {error?.message || "Verify your internet connection and try again."}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-8 py-2 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}

function Dashboard() {
  const { videos: initialVideos, nextPageTokens: initialTokens, watchedIds } = Route.useLoaderData()
  const [videos, setVideos] = useState(initialVideos)
  const [nextPageTokens, setNextPageTokens] = useState(initialTokens)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([])

  const uniqueChannels = useMemo(() => {
    const channelMap = new Map<string, { id: string; title: string; avatar: string }>()
    videos.forEach((v: YouTubeVideo) => {
      if (!channelMap.has(v.channelId)) {
        channelMap.set(v.channelId, {
          id: v.channelId,
          title: v.channelTitle,
          avatar: v.channelAvatar || "",
        })
      }
    })
    return Array.from(channelMap.values())
  }, [videos]);

  const filteredVideos = useMemo(() => {
    if (selectedChannelIds.length === 0) return videos
    return videos.filter((v: YouTubeVideo) => selectedChannelIds.includes(v.channelId))
  }, [videos, selectedChannelIds]);

  const toggleChannel = (id: string) => {
    setSelectedChannelIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const loadMore = useCallback(async () => {
    if (isFetchingMore || Object.keys(nextPageTokens).length === 0) return

    setIsFetchingMore(true)
    try {
      const result = await fetchFeedForUser({ data: nextPageTokens })
      if (result && result.videos.length > 0) {
        setVideos((prev: any[]) => [...prev, ...result.videos])
        setNextPageTokens(result.nextPageTokens)
      } else {
        setNextPageTokens({})
      }
    } catch (err) {
      console.error("[Dashboard] Error loading more videos:", err)
    } finally {
      setIsFetchingMore(false)
    }
  }, [nextPageTokens, isFetchingMore])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [loadMore])

  if (!videos || videos.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center gap-4">
        <img src="/logo.png" alt="Kivio" className="size-24 opacity-20 p-4 bg-black dark:bg-white rounded-4xl mb-2" />
        <h2 className="text-2xl font-bold">Your feed is empty</h2>
        <p className="text-muted-foreground">
          Add some YouTube handles in the Channels page to see videos here.
        </p>
        <Link
          to="/channels"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          Go to Channels
        </Link>
      </div>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] max-w-[1600px] mx-auto px-4 md:px-0">
      {/* Fixed Sidebar Filter */}
      <aside className="hidden md:flex flex-col w-72 h-[calc(100vh-4rem)] sticky top-0 border-r border-border/50 p-4 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground">
            Channels
          </h2>
          {selectedChannelIds.length > 0 && (
            <button
              onClick={() => setSelectedChannelIds([])}
              className="text-[10px] font-bold text-primary/80 tracking-wider hover:bg-pri cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
          <button
            onClick={() => setSelectedChannelIds([])}
            className={`flex items-center p-3 rounded-xl text-sm font-semibold border cursor-pointer ${
              selectedChannelIds.length === 0
                ? 'bg-primary/80 hover:bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'bg-transparent border-transparent text-foreground/80 hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            All Channels
          </button>

          {uniqueChannels.map((channel: any) => (
            <button
              key={channel.id}
              onClick={() => toggleChannel(channel.id)}
              className={`flex items-center gap-2 p-2 rounded-xl text-sm font-semibold border cursor-pointer ${
                selectedChannelIds.includes(channel.id)
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-transparent border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <img
                src={channel.avatar}
                alt={channel.title}
                className="size-8 rounded-full border border-border/20 shadow-sm shrink-0"
              />
              <span className="truncate">{channel.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Grid Content */}
      <div className="flex-1 p-4">
        {filteredVideos.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-2">
            <p className="text-xl font-bold">No videos found</p>
            <p className="text-sm text-muted-foreground">Try selecting a different filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredVideos.map((video: any) => (
              <Link
                to={`/videos/$videoId`}
                params={{ videoId: video.id }}
                key={video.id}
                className="hover:scale-[1.01]"
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
          style={{ opacity: Object.keys(nextPageTokens).length > 0 ? 1 : 0 }}
        >
          {isFetchingMore && (
             <div className="flex items-center gap-3 text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
               <IconLoader className="animate-spin" size={20} />
               <span className="text-sm font-medium">Loading more videos...</span>
             </div>
          )}
        </div>
      </div>
    </main>
  )
}