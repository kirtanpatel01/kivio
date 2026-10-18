import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import Header from "../components/Header";
import { cn } from "#/lib/utils";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    title: "Kivio - Your Personal YouTube Feed",
    meta: [
      {
        name: "referrer",
        content: "strict-origin-when-cross-origin",
      },
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content:
          "Kivio is a minimal YouTube client. Manage your channels, track history and discover new videos with ease.",
      },
      {
        name: "keywords",
        content: "YouTube, Kivio, Video, Channels, History, Minimalist",
      },
      {
        property: "og:title",
        content: "Kivio - Your Personal YouTube Feed",
      },
      {
        property: "og:description",
        content:
          "Track your YouTube history and manage your favorite channels in one place.",
      },
      {
        property: "og:image",
        content: "/logo.png",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
        type: "image/x-icon",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  errorComponent: AppError,
  notFoundComponent: PageNotFound,
  shellComponent: RootDocument,
});

import {
  IconAlertTriangle,
  IconRefresh,
  IconHome,
  IconCompass,
  IconDeviceTv,
} from "@tabler/icons-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/query";
import TopProgressBar from "../components/TopProgressBar";

function AppError({ error }: { error: unknown }) {
  const router = useRouter();
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-secondary/15 border border-border/60 rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center gap-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-inner">
          <IconAlertTriangle size={34} stroke={1.8} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <button
            onClick={() => router.invalidate()}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-primary/25 cursor-pointer"
          >
            <IconRefresh size={16} />
            Try Again
          </button>
          <Link
            to="/"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary/80 text-foreground font-semibold text-xs sm:text-sm transition-colors border border-border/40"
          >
            <IconHome size={16} />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function PageNotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-secondary/15 border border-border/60 rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center gap-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
        <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner border border-primary/20">
          <span className="text-3xl font-black tracking-tight">404</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Page Not Found</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The link you followed may be broken, or the page may have been moved or removed.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full pt-2">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-primary/25"
          >
            <IconHome size={16} />
            Return to Feed
          </Link>
          <div className="flex items-center gap-2 w-full">
            <Link
              to="/channels"
              search={{ tab: "videos" }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 text-foreground text-xs font-semibold transition-colors border border-border/40"
            >
              <IconDeviceTv size={14} />
              Channels
            </Link>
            <Link
              to="/shorts"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 text-foreground text-xs font-semibold transition-colors border border-border/40"
            >
              <IconCompass size={14} />
              Shorts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const isShorts = useRouterState({
    select: (s) => s.location.pathname === "/shorts",
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased overflow-y-hidden">
        <TopProgressBar />
        <QueryClientProvider client={queryClient}>
          <Header />
          <main
            className={cn(
              "h-[calc(100vh-3rem)] custom-scrollbar scrollbar-gutter-[stable]",
              isShorts ? "overflow-y-hidden" : "overflow-y-auto",
            )}
          >
            {children}
          </main>
        </QueryClientProvider>

        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
