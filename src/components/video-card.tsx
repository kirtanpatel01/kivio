/**
 * ============================================================================
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *                        STRICT WARNING FOR ALL AI AGENTS
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *  DO NOT TOUCH, MODIFY, REFACTOR, OR ALTER THE UI / JSX / CSS / STYLING OF THIS FILE!
 *  THE CARD DESIGN, HOVER BEHAVIORS, SIZES, AND LAYOUT ARE LOCKED AND FINALIZED.
 *  THE WHOLE CARD MUST NEVER SCALE UP ON HOVER. ONLY THE THUMBNAIL ITSELF SCALES ON HOVER.
 *  YOU MAY ONLY TOUCH DATA / QUERY / CACHE / MUTATION LOGIC IF SPECIFICALLY REQUIRED.
 *  DO NOT TOUCH THE UI PART OF THIS FILE UNDER ANY CIRCUMSTANCES!
 * ============================================================================
 */

import { recordHistory, getWatchedVideoIds } from "#/actions/history";
import { IconHistory } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { YouTubeVideo } from "#/types";
import { getTimeAgo } from "#/lib/utils";
import Avatar from "#/components/Avatar";
import VideoThumbnail from "#/components/VideoThumbnail";
import { useQueryClient, useQuery } from "@tanstack/react-query";

function VideoCard({
  video,
  isWatched,
}: {
  video: YouTubeVideo;
  isWatched?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const publishedAt = new Date(video.publishedAt);

  const { data: watchedVideoIds } = useQuery({
    queryKey: ["watchedVideoIds"],
    queryFn: () => getWatchedVideoIds(),
    staleTime: 1000 * 60 * 5,
  });

  const isVideoWatched =
    isWatched || (watchedVideoIds ? watchedVideoIds.includes(video.id) : false);

  const handleRecordHistory = () => {
    // Optimistically mark video as watched in query cache immediately
    queryClient.setQueryData<string[]>(["watchedVideoIds"], (old) =>
      old ? (old.includes(video.id) ? old : [...old, video.id]) : [video.id],
    );

    recordHistory({
      data: {
        videoId: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnail: video.thumbnail,
        duration: video.duration,
        viewCount: video.viewCount,
      },
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["history"] });
      })
      .catch((err) => console.error("History recording failed", err));
  };

  const handleChannelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetHandle =
      video.channelHandle || video.channelTitle || video.channelId;
    if (targetHandle) {
      navigate({
        to: "/channels",
        search: { handle: targetHandle, tab: "videos" },
      });
    }
  };

  return (
    <div
      className="w-full group cursor-pointer flex flex-col gap-3 relative"
      onClick={handleRecordHistory}
    >
      <div className="w-full h-full inset-0 absolute group-hover:bg-primary/5 z-0 rounded-xl transition-colors duration-300" />

      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-secondary/20">
        <VideoThumbnail
          src={video.thumbnail}
          videoId={video.id}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 z-20 transition-transform duration-300 ease-out"
        />
        {isVideoWatched && (
          <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white z-30 shadow-lg border border-white/10">
            <IconHistory size={14} className="text-primary" />
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-[10px] sm:text-xs font-bold text-white rounded-md backdrop-blur-sm z-30">
            {video.duration}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="w-full flex gap-3 px-1 z-20">
        <button
          type="button"
          onClick={handleChannelClick}
          className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          title={`View ${video.channelTitle} channel`}
        >
          <Avatar
            src={video.channelAvatar}
            name={video.channelTitle}
            className="size-10 rounded-full object-cover border border-border/10 bg-secondary/20"
          />
        </button>
        <div className="w-full flex flex-col gap-1 overflow-hidden">
          <h3 className="text-sm sm:text-base font-bold line-clamp-2 leading-tight">
            {video.title}
          </h3>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleChannelClick}
              className="text-xs sm:text-sm text-foreground/60 font-medium hover:text-primary hover:underline underline-offset-2 truncate text-left cursor-pointer z-30 transition-colors"
              title={`View ${video.channelTitle} channel`}
            >
              {video.channelTitle}
            </button>
            <p className="text-[10px] sm:text-xs text-foreground/40 font-medium shrink-0">
              {getTimeAgo(publishedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
