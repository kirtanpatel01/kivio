import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { IconBrandYoutube, IconArrowLeft, IconSparkles } from "@tabler/icons-react";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    title: "Global YouTube Search | Kivio",
    meta: [],
  }),
  component: GlobalSearchComingSoon,
});

function GlobalSearchComingSoon() {
  const { q } = Route.useSearch();

  return (
    <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-secondary/10 border border-border/60 rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center gap-6 shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="relative">
          <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <IconBrandYoutube size={44} stroke={1.5} />
          </div>
          <div className="absolute -top-1 -right-1 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <IconSparkles size={14} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            Coming Soon
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Global YouTube Search
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Global search across all of YouTube is currently under development. To protect API quotas and maximize speed, Kivio prioritizes your local library.
          </p>
          {q && (
            <div className="mt-3 p-2.5 rounded-xl bg-background/60 border border-border/40 text-xs font-medium text-foreground/80 truncate">
              Query: <span className="font-bold text-foreground">"{q}"</span>
            </div>
          )}
        </div>

        <div className="w-full pt-2 border-t border-border/40 flex flex-col gap-2">
          <Link
            to="/"
            search={{ q: q || undefined }}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-primary/20"
          >
            <IconArrowLeft size={16} />
            Search within Subscribed Library
          </Link>
          <Link
            to="/"
            className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-2 transition-colors"
          >
            Return to Feed
          </Link>
        </div>
      </div>
    </main>
  );
}
