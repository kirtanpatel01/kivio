import { IconChevronLeft } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

interface VideoPlayerProps {
  videoId: string;
  title: string;
}

export default function VideoPlayer({ videoId, title }: VideoPlayerProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleBack}
        className="group inline-flex items-center gap-1.5 pl-2.5 pr-4 py-1.5 rounded-full bg-secondary/70 hover:bg-secondary text-sm font-medium cursor-pointer transition-colors shadow-xs"
      >
        <IconChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
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
