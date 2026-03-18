import { IconHistory, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/history")({
  component: RouteComponent,
});

const MOCK_HISTORY = [
  {
    id: "v1",
    title: "How to use tailwind and motion to create super cool UI",
    channel: "Manu Paji",
    views: "100k",
    time: "2 hours ago",
    thumbnail: "https://picsum.photos/seed/v1/300/200",
    duration: "14:32",
  },
  {
    id: "v2",
    title: "Mastering React Query for Enterprise Applications",
    channel: "TanStack Guru",
    views: "85k",
    time: "5 hours ago",
    thumbnail: "https://picsum.photos/seed/v2/300/200",
    duration: "22:10",
  },
  {
    id: "v3",
    title: "Vite 7 vs Webpack 5: The Ultimate Comparison",
    channel: "Frontend Weekly",
    views: "1.2M",
    time: "1 day ago",
    thumbnail: "https://picsum.photos/seed/v3/300/200",
    duration: "10:05",
  },
  {
    id: "v4",
    title: "Building an Agentic AI Assistant from scratch",
    channel: "Tech Insights",
    views: "450k",
    time: "2 days ago",
    thumbnail: "https://picsum.photos/seed/v4/300/200",
    duration: "45:12",
  },
  {
    id: "v5",
    title: "Building an Agentic AI Assistant from scratch",
    channel: "Tech Insights",
    views: "450k",
    time: "2 days ago",
    thumbnail: "https://picsum.photos/seed/v4/300/200",
    duration: "45:12",
  },
  {
    id: "v6",
    title: "Building an Agentic AI Assistant from scratch",
    channel: "Tech Insights",
    views: "450k",
    time: "2 days ago",
    thumbnail: "https://picsum.photos/seed/v4/300/200",
    duration: "45:12",
  },
  {
    id: "v7",
    title: "Building an Agentic AI Assistant from scratch",
    channel: "Tech Insights",
    views: "450k",
    time: "2 days ago",
    thumbnail: "https://picsum.photos/seed/v4/300/200",
    duration: "45:12",
  },
  {
    id: "v8",
    title: "Building an Agentic AI Assistant from scratch",
    channel: "Tech Insights",
    views: "450k",
    time: "2 days ago",
    thumbnail: "https://picsum.photos/seed/v4/300/200",
    duration: "45:12",
  },
  {
    id: "v9",
    title: "Building an Agentic AI Assistant from scratch",
    channel: "Tech Insights",
    views: "450k",
    time: "2 days ago",
    thumbnail: "https://picsum.photos/seed/v4/300/200",
    duration: "45:12",
  },
];

function RouteComponent() {
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [search, setSearch] = useState("");

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.channel.toLowerCase().includes(search.toLowerCase()),
  );

  const removeItem = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHistory(history.filter((h) => h.id !== id));
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear your entire watch history?")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)]">
      <div className="relative w-full max-w-4xl mx-auto text-foreground">
        {/* Header Section */}
        <div className="p-4 sm:p-6 space-y-4 fixed inset-x-0 max-w-4xl mx-auto z-10 bg-background">
          <button
            onClick={clearAll}
            className="w-fit text-xs font-bold tracking-widest text-foreground-secondary hover:text-primary transition-colors cursor-pointer"
          >
            Clear All History
          </button>

          {/* Search Bar */}
          <div className="relative group">
            <IconSearch
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary group-focus-within:text-primary transition-colors"
            />
            <input
              className="w-full pl-10 pr-4 py-3 bg-secondary/15 border border-border rounded-xl ring-2 ring-transparent focus:ring-primary/30 focus:outline-none focus:border-transparent transition-all duration-300 font-medium"
              placeholder="Search within history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-primary transition-colors"
              >
                <IconX size={18} />
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="flex flex-col gap-4 p-4 sm:p-6 pt-32 sm:pt-36">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 bg-secondary/5 rounded-3xl border border-dashed border-border/50">
              <p className="text-foreground-secondary font-semibold italic">
                {search
                  ? "No matches found in your history"
                  : "Your watch history is empty"}
              </p>
            </div>
          ) : (
            filteredHistory.map((video) => (
              <Link
                key={video.id}
                to="/videos/$videoId"
                params={{ videoId: video.id }}
                className="group relative flex flex-col sm:flex-row gap-4 sm:p-3 rounded-2xl hover:bg-secondary/20 transition-all duration-300 border border-transparent hover:border-border/50"
              >
                {/* Thumbnail */}
                <div className="relative w-full sm:w-56 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-800 shadow-sm transition-shadow group-hover:shadow-md">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-[10px] font-bold text-white rounded-md backdrop-blur-sm">
                    {video.duration}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden pr-10">
                  <h3 className="text-base sm:text-lg font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className="text-sm text-foreground-secondary font-semibold hover:text-primary transition-colors">
                      {video.channel}
                    </p>
                    <span className="hidden sm:inline text-foreground-secondary/30">
                      •
                    </span>
                    <p className="text-xs text-foreground-secondary/70">
                      {video.views} views
                    </p>
                    <span className="hidden sm:inline text-foreground-secondary/30">
                      •
                    </span>
                    <p className="text-xs text-foreground-secondary/70 italic">
                      Watched {video.time}
                    </p>
                  </div>
                </div>

                {/* Individual Remove Button */}
                <button
                  onClick={(e) => removeItem(video.id, e)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2.5 bg-background border border-border rounded-full text-foreground-secondary hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-90"
                  title="Remove from history"
                >
                  <IconTrash size={18} />
                </button>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
