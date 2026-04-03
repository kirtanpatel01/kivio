import { Link } from "@tanstack/react-router";
import { recordHistory } from "#/actions/history";
import { IconHistory } from "@tabler/icons-react";
import { getTimeAgo } from "#/lib/utils";
import type { YouTubeVideo } from "#/types";

interface SuggestionCardProps {
  video: YouTubeVideo;
  isWatched: boolean;
}

export default function SuggestionCard({ video, isWatched }: SuggestionCardProps) {
  return (
    <Link 
      to={`/videos/$videoId`} 
      params={{ videoId: video.id }}
      onClick={() => {
        recordHistory({
          data: {
            videoId: video.id,
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnail: video.thumbnail,
            duration: video.duration,
            viewCount: video.viewCount,
          },
        }).catch((e) => console.error(e));
      }}
    >
      <div className="group flex gap-3 cursor-pointer p-2 rounded-xl hover:bg-secondary/40 border border-transparent hover:border-border/10">
        {/* Compact Thumbnail */}
        <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-secondary/20">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105"
          />
          {isWatched && (
            <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 backdrop-blur-md rounded-full text-white z-30 shadow-md">
              <IconHistory size={11} className="text-primary" />
            </div>
          )}
        </div>

        {/* Suggestions Info */}
        <div className="flex flex-col gap-1 overflow-hidden pointer-events-none">
          <h4 className="text-sm font-semibold line-clamp-2 leading-tight group-hover:text-primary">
            {video.title}
          </h4>
          <div className="flex flex-col">
            <p className="text-xs text-foreground-secondary font-semibold">
              {video.channelTitle}
            </p>
            <p className="text-xs text-foreground-secondary/70">
              {getTimeAgo(video.publishedAt)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
