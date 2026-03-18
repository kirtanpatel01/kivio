import { IconChevronDown } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/videos/$videoId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { videoId } = Route.useParams();
  const [showDescription, setShowDescription] = useState(false);

  return (
    <div className="w-full h-[calc(100vh-3rem)] flex overflow-hidden bg-background">
      {/* LEFT SECTION: Player & Details (Scrollable) */}
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar border-r border-border">
        <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-6">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src="https://www.youtube.com/embed/3MDl6r1B6Z8?si=77g0VUwNjxpAQRtQ"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          <div className="space-y-4">
            {/* Video Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="flex flex-col gap-4">
                <h1 className="text-xl sm:text-2xl font-semibold leading-tight">
                  How to use tailwind and motion to create super cool UI
                </h1>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <img
                      src="https://yt3.ggpht.com/n7G_or_yexSPKjDYTVLw59w0B7DUTWT3mGln3ghAoGQvFCwkd1lxeQTbCE_hV2q7ASJC3PU3dw=s68-c-k-c0x00ffffff-no-rj"
                      alt="manu_paj"
                      className="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-primary transition-all"
                    />
                    <div>
                      <h2 className="font-semibold text-sm sm:text-base">
                        Manu Paji
                      </h2>
                      <p className="text-xs text-foreground-secondary tracking-wider">
                        100k Subscribers
                      </p>
                    </div>
                  </div>

                  <div className="border-l border-primary/30 pl-4 flex flex-col gap-0.5 text-sm">
                    <span className="font-semibold">100k views</span>
                    <span className="text-xs text-foreground-secondary italic">
                      Published on 2026-03-17
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDescription(!showDescription)}
                className={`px-5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer text-sm font-semibold border ${
                  showDescription
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-secondary/40 hover:bg-secondary border-transparent"
                }`}
              >
                Description
                <IconChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${showDescription ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Description Box */}
            <div
              className={`overflow-hidden bg-secondary/20 rounded-2xl border border-white/5 ${
                showDescription
                  ? "max-h-[1000px] opacity-100 p-5 mt-4"
                  : "max-h-0 opacity-0 p-0"
              }`}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground-secondary leading-relaxed">
                <p className="font-semibold text-foreground mb-2">
                  About this video:
                </p>
                In this detailed tutorial, we dive deep into the world of
                Tailwind CSS v4 and Framer Motion. Learn how to build
                high-performance, aesthetically pleasing interfaces that WOW
                your users.
                <br />
                <br />
                🔥 Topics covered:
                <br />
                - Modern Grid & Flexbox layouts
                <br />
                - Advanced CSS variables and @theme blocks
                <br />
                - Hover micro-interactions
                <br />
                - Independent scrollable sections
                <br />
                <br />
                Don't forget to like and subscribe for more content! #UI
                #TailwindCSS #WebDev
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Suggestions (Scrollable) */}
      <div className="hidden lg:flex flex-col w-[400px] h-full overflow-y-auto custom-scrollbar bg-secondary/5 px-2 py-4 space-y-4">
        <h3 className="font-semibold text-sm tracking-widest text-foreground-secondary px-2">
          Suggested Videos
        </h3>

        <div className="flex flex-col gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Link to={`/videos/$videoId`} params={{ videoId: i.toString() }}>
              <div
                key={i}
                className="group flex gap-3 cursor-pointer p-2 rounded-xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-white/5"
              >
                {/* Compact Thumbnail */}
                <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                  <img
                    src={`https://picsum.photos/seed/${i + 10}/300/200`}
                    alt="Suggested video"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-[10px] font-semibold text-white rounded">
                    12:05
                  </div>
                </div>

                {/* Suggestions Info */}
                <div className="flex flex-col gap-1 overflow-hidden pointer-events-none">
                  <h4 className="text-xs sm:text-sm font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    Mastering the Art of Modern Web Design: Episode {i + 1}
                  </h4>
                  <div className="flex flex-col">
                    <p className="text-[11px] text-foreground-secondary font-semibold">
                      Design Masterclass
                    </p>
                    <p className="text-[10px] text-foreground-secondary/70">
                      1.2M views • {i + 1} days ago
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
