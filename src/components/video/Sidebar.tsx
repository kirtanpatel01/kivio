import { IconPlaylist } from "@tabler/icons-react";
import type { YouTubeVideo, YouTubePlaylist } from "#/types";
import PlaylistVideoCard from "./PlaylistVideoCard";
import SuggestionCard from "./SuggestionCard";

interface SidebarProps {
  currentVideoId: string;
  playlist: YouTubePlaylist | null;
  playlistVideos: YouTubeVideo[];
  suggestions: YouTubeVideo[];
  watchedIds: string[];
}

export default function Sidebar({
  currentVideoId,
  playlist,
  playlistVideos,
  suggestions,
  watchedIds,
}: SidebarProps) {
  return (
    <div className="hidden lg:flex flex-col w-[400px] h-full overflow-y-auto custom-scrollbar bg-secondary/5 px-2 py-4 space-y-4">
      {playlist && (
        <div className="flex flex-col gap-2 mb-6">
          <div className="px-2 py-3 bg-secondary/30 rounded-xl mb-2">
            <h3 className="font-bold text-sm tracking-tight mb-1 flex items-center gap-2">
              <IconPlaylist size={18} className="text-primary" />
              {playlist.title}
            </h3>
            <p className="text-xs text-foreground-secondary font-medium">
              {playlistVideos.findIndex((v) => v.id === currentVideoId) + 1} /{" "}
              {playlistVideos.length}
            </p>
          </div>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {playlistVideos.map((v, index) => (
              <PlaylistVideoCard
                key={`${v.id}-${index}`}
                video={v}
                isCurrent={v.id === currentVideoId}
                index={index}
                playlistId={playlist.id}
              />
            ))}
          </div>
          <div className="h-px bg-border/40 my-2" />
        </div>
      )}

      <h3 className="font-semibold text-sm tracking-widest text-foreground-secondary px-2 uppercase">
        {playlist ? "Up Next" : "Suggested Videos"}
      </h3>

      <div className="flex flex-col gap-4">
        {suggestions.map((v) => (
          <SuggestionCard
            key={v.id}
            video={v}
            isWatched={watchedIds.includes(v.id)}
          />
        ))}
      </div>
    </div>
  );
}
