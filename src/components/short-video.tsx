import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import type { YouTubeVideo } from "#/types";
import { formatCount } from "#/lib/utils";
import { useEffect, useRef, useState } from "react";

interface ShortVideoProps {
  video: YouTubeVideo;
  isActive: boolean;
}

export default function ShortVideo({ video, isActive }: ShortVideoProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
      controlVideo("pauseVideo");
    } else {
      setIsPlaying(true);
      controlVideo("playVideo");
    }
  }, [isActive]);

  const controlVideo = (command: string) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command, args: [] }),
        "*"
      );
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      controlVideo("pauseVideo");
      setIsPlaying(false);
    } else {
      controlVideo("playVideo");
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] snap-start shrink-0 overflow-hidden bg-black flex items-center justify-center">
      {/* Background Blur */}
      <div 
        className="absolute inset-0 opacity-30 blur-2xl scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${video.thumbnail})`, backgroundSize: 'cover' }}
      />
      
      {/* Video Container */}
      <div className="relative z-10 w-full max-w-[450px] aspect-9/16 bg-zinc-900 shadow-2xl overflow-hidden rounded-xl">
        <div 
          onClick={togglePlay}
          className="absolute inset-0 -top-16 h-[calc(100%+128px)] cursor-pointer"
        >
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${video.id}?autoplay=${isActive ? 1 : 0}&modestbranding=1&rel=0&iv_load_policy=3&controls=0&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full border-0 pointer-events-none"
          />
        </div>

        {/* Central Play/Pause Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="size-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white scale-animation animate-in fade-in zoom-in duration-200">
               <IconPlayerPlay size={40} fill="white" />
            </div>
          </div>
        )}

        {/* Hover Pause Button (Subtle show/hide) */}
        <div 
          onClick={togglePlay}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20 cursor-pointer h-1/2"
        >
          {isPlaying && (
             <div className="size-16 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white">
                <IconPlayerPause size={32} fill="white" />
             </div>
          )}
        </div>
        
        {/* Overlay Metadata */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 via-black/40 to-transparent text-white pointer-events-none z-30">
          <div className="flex flex-col gap-3">
            {/* Channel Info */}
            <div className="flex items-center gap-3">
              {video.channelAvatar && (
                <img 
                  src={video.channelAvatar} 
                  alt={video.channelTitle} 
                  className="size-10 rounded-full border border-white/20"
                />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide">@{video.channelTitle}</span>
                {video.subscriberCount && (
                  <span className="text-[10px] text-white/70 font-medium tracking-tight">
                    {formatCount(video.subscriberCount)} subscribers
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-base font-medium leading-snug line-clamp-2 pr-12">
              {video.title}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
