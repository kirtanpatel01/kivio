import { fetchVideoDetails, fetchVideosByPlaylistId } from "#/actions/youtube";
import { recordHistory, getWatchedVideoIds } from "#/actions/history";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { IconChevronDown, IconChevronLeft, IconHistory } from "@tabler/icons-react";

export const Route = createFileRoute("/videos/$videoId")({
  loader: async ({ params: { videoId } }) => {
    const [video, watchedIds] = await Promise.all([
      fetchVideoDetails({ data: videoId }),
      getWatchedVideoIds()
    ]);
    
    if (!video) return { video: null, suggestions: [], watchedIds: watchedIds || [] };

    // Fetch some suggestions from the same channel
    const suggestionData = video.uploadsPlaylistId 
      ? await fetchVideosByPlaylistId({ data: { playlistId: video.uploadsPlaylistId } })
      : null;

    return { 
      video, 
      suggestions: suggestionData?.videos || [],
      watchedIds: watchedIds || []
    };
  },
  component: RouteComponent,
});

function formatCount(count: string | number) {
  const n = parseInt(count.toString());
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function getTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

function LinkifiedText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 transition-colors break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function RouteComponent() {
  const { video, suggestions, watchedIds } = Route.useLoaderData();
  const [showDescription, setShowDescription] = useState(false);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((v: any) => v.id !== video?.id);
  }, [suggestions, video?.id]);

  if (!video) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold">Video not found</h2>
        <Link to="/" className="text-primary hover:underline">Back to feed</Link>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex overflow-hidden bg-background">
      {/* LEFT SECTION: Player & Details (Scrollable) */}
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar border-r border-border">
        <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4">
          <button 
            onClick={() => window.history.back()}
            className="group flex items-center gap-1 pl-2 pr-4 py-2 rounded-full bg-secondary/80 hover:bg-secondary text-sm font-medium transition-all duration-200 cursor-pointer"
          >
            <IconChevronLeft size={18} className="group-hover:-translate-x-px transition-transform" />
            Back
          </button>

          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          <div className="space-y-4">
            {/* Video Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="flex flex-col gap-4">
                <h1 className="text-xl sm:text-2xl font-semibold leading-tight line-clamp-2">
                  {video.title}
                </h1>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <img
                      src={video.channelAvatar}
                      alt={video.channelTitle}
                      className="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-primary transition-all object-cover"
                    />
                    <div>
                      <h2 className="font-semibold text-sm sm:text-base">
                        {video.channelTitle}
                      </h2>
                      <p className="text-xs text-foreground-secondary tracking-wider">
                        {formatCount(video.subscriberCount || 0)} Subscribers
                      </p>
                    </div>
                  </div>

                  <div className="border-l border-primary/30 pl-4 flex flex-col gap-0.5 text-sm">
                    <span className="font-semibold">{formatCount(video.viewCount)} views</span>
                    <span className="text-xs text-foreground-secondary italic">
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDescription(!showDescription)}
                className={`px-5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer text-sm font-semibold border ${
                  showDescription
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-secondary/40 hover:bg-secondary border-transparent"
                }`}
              >
                Description
                <IconChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${showDescription ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Description Box */}
            <div
              className={`overflow-hidden bg-secondary/20 rounded-2xl border border-border/5 mb-8 ${
                showDescription
                  ? "max-h-[1000px] opacity-100 p-5 mt-4"
                  : "max-h-0 opacity-0 p-0"
              }`}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
                <LinkifiedText text={video.description} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Suggestions (Scrollable) */}
      <div className="hidden lg:flex flex-col w-[400px] h-full overflow-y-auto custom-scrollbar bg-secondary/5 px-2 py-4 space-y-4">
        <h3 className="font-semibold text-sm tracking-widest text-foreground-secondary px-2">
          Suggested Videos
        </h3>

        <div className="flex flex-col gap-4">
          {filteredSuggestions.map((v: any) => (
            <Link 
              key={v.id} 
              to={`/videos/$videoId`} 
              params={{ videoId: v.id }}
              onClick={() => {
                recordHistory({
                  data: {
                    videoId: v.id,
                    title: v.title,
                    channelTitle: v.channelTitle,
                    thumbnail: v.thumbnail,
                    duration: v.duration,
                    viewCount: v.viewCount,
                  },
                }).catch((e) => console.error(e));
              }}
            >
              <div className="group flex gap-3 cursor-pointer p-2 rounded-xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-border/10">
                {/* Compact Thumbnail */}
                <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-secondary/20">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {watchedIds.includes(v.id) && (
                    <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 backdrop-blur-md rounded-full text-white z-30 shadow-md">
                      <IconHistory size={11} className="text-primary" />
                    </div>
                  )}
                </div>

                {/* Suggestions Info */}
                <div className="flex flex-col gap-1 overflow-hidden pointer-events-none">
                  <h4 className="text-sm font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {v.title}
                  </h4>
                  <div className="flex flex-col">
                    <p className="text-xs text-foreground-secondary font-semibold">
                      {v.channelTitle}
                    </p>
                    <p className="text-xs text-foreground-secondary/70">
                      {getTimeAgo(v.publishedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
