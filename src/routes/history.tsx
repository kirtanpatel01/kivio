import { IconHistory, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getHistory, deleteHistoryItem, clearHistory } from "#/actions/history";
import { getTimeAgo } from "#/lib/utils";

export const Route = createFileRoute("/history")({
  loader: async () => {
    const history = await getHistory();
    return { initialHistory: history || [] };
  },
  head: () => ({
    title: 'History | Kivio',
    meta: []
  }),
  component: RouteComponent,
  errorComponent: ErrorState,
});

function ErrorState({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="size-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mb-2">
         <span className="text-4xl font-black">!</span>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold italic tracking-tight uppercase">History Error</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {error?.message || "There was an error retrieving your history. Check your connection and try again."}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-10 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 shadow-xl transition-all"
      >
        Try Again
      </button>
    </div>
  );
}

function RouteComponent() {
  const { initialHistory } = Route.useLoaderData();
  const [history, setHistory] = useState(initialHistory);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.channelTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const removeItem = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteHistoryItem({ data: id });
      setHistory(history.filter((h) => h.id !== id));
      router.invalidate();
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    if (confirm("Are you sure you want to clear your entire watch history?")) {
      try {
        await clearHistory();
        setHistory([]);
        router.invalidate();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)]">
      <div className="relative w-full max-w-4xl mx-auto text-foreground">
        {/* Header Section */}
        <div className="p-4 sm:p-6 space-y-4 fixed inset-x-0 max-w-4xl mx-auto z-10 bg-background">
          <button
            onClick={clearAll}
            className="w-fit text-xs font-bold tracking-widest text-foreground-secondary hover:text-primary cursor-pointer"
          >
            Clear All History
          </button>

          {/* Search Bar */}
          <div className="relative group">
            <IconSearch
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary group-focus-within:text-primary"
            />
            <input
              className="w-full pl-10 pr-4 py-3 bg-secondary/15 border border-border rounded-xl ring-2 ring-transparent focus:ring-primary/30 focus:outline-none focus:border-transparent font-medium"
              placeholder="Search within history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-primary"
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
              <img src="/logo.png" alt="Kivio" className="size-16 opacity-15 mx-auto p-3 bg-black dark:bg-white rounded-2xl mb-4" />
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
                params={{ videoId: video.videoId }}
                className="group relative flex flex-col sm:flex-row gap-4 sm:p-3 rounded-2xl hover:bg-secondary/20 border border-transparent hover:border-border/50"
              >
                {/* Thumbnail */}
                <div className="relative w-full sm:w-56 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-800 shadow-sm group-hover:shadow-md">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100">
                    <IconHistory size={12} />
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-[10px] font-bold text-white rounded-md backdrop-blur-sm">
                    {video.duration}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden pr-10">
                  <h3 className="font-semibold line-clamp-2 leading-tight group-hover:text-primary">
                    {video.title}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className="text-sm text-foreground-secondary font-medium hover:text-primary">
                      {video.channelTitle}
                    </p>
                    {video.viewCount && (
                      <>
                        <span className="hidden sm:inline text-foreground-secondary/30">
                          •
                        </span>
                        <p className="text-sm text-foreground-secondary/70">
                          {video.viewCount} views
                        </p>
                      </>
                    )}
                    <span className="hidden sm:inline text-foreground-secondary/30">
                      •
                    </span>
                    <p className="text-sm text-foreground-secondary/70 italic">
                      Watched {getTimeAgo(video.watchedAt)}
                    </p>
                  </div>
                </div>

                {/* Individual Remove Button */}
                <button
                  onClick={(e) => removeItem(video.id, e)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2.5 bg-background border border-border rounded-full text-foreground-secondary hover:text-rose-500 hover:border-rose-200 cursor-pointer shadow-sm hover:shadow-md active:scale-90"
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
