import { useState, useEffect, useMemo } from "react";
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
  // Extract effective videoId from props or from YouTube image URL
  const effectiveVideoId = useMemo(() => {
    if (videoId) return videoId;
    if (src && src.includes("ytimg.com/vi/")) {
      const match = src.match(/vi\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  }, [videoId, src]);

  // Determine highest definition candidate URL (maxresdefault is Full HD 1280x720 / 1080p)
  const getInitialSrc = () => {
    if (effectiveVideoId) {
      return `https://i.ytimg.com/vi/${effectiveVideoId}/maxresdefault.jpg`;
    }
    if (src && src.includes("hqdefault.jpg")) {
      return src.replace("hqdefault.jpg", "maxresdefault.jpg");
    }
    return src;
  };

  const [imgSrc, setImgSrc] = useState<string | null | undefined>(getInitialSrc);
  const [attemptStage, setAttemptStage] = useState<number>(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setImgSrc(getInitialSrc());
    setAttemptStage(0);
    setHasFailedAll(false);
  }, [src, effectiveVideoId]);

  const handleError = () => {
    if (!effectiveVideoId) {
      if (src && imgSrc !== src) {
        setImgSrc(src);
      } else {
        setHasFailedAll(true);
      }
      return;
    }

    // High Definition Fallback Ladder:
    // Stage 0: maxresdefault.jpg (1280x720 Full HD)
    // Stage 1: sddefault.jpg (640x480 Standard HD)
    // Stage 2: hqdefault.jpg (480x360 High Quality - guaranteed on YouTube)
    // Stage 3: provided src if different
    if (attemptStage === 0) {
      setAttemptStage(1);
      setImgSrc(`https://i.ytimg.com/vi/${effectiveVideoId}/sddefault.jpg`);
    } else if (attemptStage === 1) {
      setAttemptStage(2);
      setImgSrc(`https://i.ytimg.com/vi/${effectiveVideoId}/hqdefault.jpg`);
    } else if (attemptStage === 2 && src && imgSrc !== src) {
      setAttemptStage(3);
      setImgSrc(src);
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
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  );
}
