import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { formatCount } from "#/lib/utils";
import type { YouTubeVideo } from "#/types";
import { LinkifiedText } from "./LinkifiedText";

interface VideoDetailsProps {
  video: YouTubeVideo;
}

export default function VideoDetails({ video }: VideoDetailsProps) {
  const [showDescription, setShowDescription] = useState(false);

  return (
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
                className="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-primary object-cover"
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
              <span className="font-semibold">
                {formatCount(video.viewCount || 0)} views
              </span>
              <span className="text-xs text-foreground-secondary italic">
                {new Date(video.publishedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowDescription(!showDescription)}
          className={`px-5 py-2 rounded-full flex items-center gap-2 cursor-pointer text-sm font-semibold border ${
            showDescription
              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
              : "bg-secondary/40 hover:bg-secondary border-transparent"
          }`}
        >
          Description
          <IconChevronDown
            size={18}
            className={` ${showDescription ? "rotate-180" : ""}`}
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
          <LinkifiedText text={video.description || ""} />
        </div>
      </div>
    </div>
  );
}
