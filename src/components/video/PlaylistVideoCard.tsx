import { Link } from "@tanstack/react-router";
import { recordHistory } from "#/actions/history";
import type { YouTubeVideo } from "#/types";

interface PlaylistVideoCardProps {
  video: YouTubeVideo;
  isCurrent: boolean;
  index: number;
  playlistId: string;
}

export default function PlaylistVideoCard({ video, isCurrent, index, playlistId }: PlaylistVideoCardProps) {
  return (
    <Link 
      to={`/videos/$videoId`} 
      params={{ videoId: video.id }}
      search={{ playlistId }}
      className={`group flex gap-3 p-2 rounded-xl border transition-all duration-200 ${
        isCurrent 
          ? "bg-primary/10 border-primary/20 shadow-sm" 
          : "hover:bg-secondary/40 border-transparent hover:border-border/10"
      }`}
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
      <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-secondary/20">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold">
          {index + 1}
        </div>
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <h4 className={`text-xs font-semibold line-clamp-2 leading-snug ${isCurrent ? "text-primary" : "group-hover:text-primary"}`}>
          {video.title}
        </h4>
        <p className="text-[10px] text-foreground-secondary font-medium">
          {video.channelTitle}
        </p>
      </div>
    </Link>
  );
}
