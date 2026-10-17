import { useState } from "react";
import { cn } from "#/lib/utils";
import { IconVideo } from "@tabler/icons-react";

interface VideoThumbnailProps {
  src?: string | null;
  videoId?: string;
  alt?: string;
  className?: string;
}

export default function VideoThumbnail({
  src,
  videoId,
  alt = "",
  className,
}: VideoThumbnailProps) {
  const [imgSrc, setImgSrc] = useState<string | null | undefined>(src);
  const [hasFailedAll, setHasFailedAll] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setImgSrc(src);
    setHasFailedAll(false);
  }

  const handleError = () => {
    // If it failed and we haven't tried YouTube's guaranteed hqdefault thumbnail yet
    if (videoId && imgSrc !== `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`) {
      setImgSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    } else {
      setHasFailedAll(true);
    }
  };

  if (!imgSrc || hasFailedAll) {
    return (
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center bg-zinc-900/80 text-zinc-500 select-none",
          className,
        )}
      >
        <IconVideo size={28} className="opacity-40 mb-1" />
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
          Video
        </span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  );
}
