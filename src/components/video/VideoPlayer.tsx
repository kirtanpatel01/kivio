import { IconChevronLeft } from "@tabler/icons-react";

interface VideoPlayerProps {
  videoId: string;
  title: string;
}

export default function VideoPlayer({ videoId, title }: VideoPlayerProps) {
  return (
    <div className="space-y-4">
      <button 
        onClick={() => window.history.back()}
        className="group flex items-center gap-1 pl-2 pr-4 py-2 rounded-full bg-secondary/80 hover:bg-secondary text-sm font-medium cursor-pointer"
      >
        <IconChevronLeft size={18} className="group-hover:-translate-x-px" />
        Back
      </button>

      <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
