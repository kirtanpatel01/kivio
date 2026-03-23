import { recordHistory } from "#/actions/history";
import { IconHistory } from "@tabler/icons-react";

function getTimeAgo(date: Date) {
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

function VideoCard({ video, isWatched }: { video: any; isWatched?: boolean }) {
  const publishedAt = new Date(video.publishedAt);

  const handleRecordHistory = () => {
    recordHistory({
      data: {
        videoId: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnail: video.thumbnail,
        duration: video.duration,
        viewCount: video.viewCount,
      },
    }).catch((err) => console.error("History recording failed", err));
  };

  return (
    <div 
      className="w-full group cursor-pointer flex flex-col gap-3 relative"
      onClick={handleRecordHistory}
    >
      <div className="w-full h-full inset-0 absolute group-hover:bg-primary/5 z-0 group-hover:scale-[1.02] rounded-xl transition-all duration-300" />
      
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-secondary/20">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300 z-20"
        />
        {isWatched && (
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
        <img
          src={video.channelAvatar}
          alt={video.channelTitle}
          className="size-10 rounded-full shrink-0 object-cover border border-border/10 bg-secondary/20"
        />
        <div className="w-full flex flex-col gap-1 overflow-hidden">
          <h3 className="text-sm sm:text-base font-bold line-clamp-2 leading-tight">
            {video.title}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-foreground/60 font-medium hover:text-primary transition-colors truncate">
              {video.channelTitle}
            </p>
            <p className="text-[10px] sm:text-xs text-foreground/40 font-medium">
              {getTimeAgo(publishedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
