import { HeadContent, Scripts, createRootRoute, Link } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import Header from "../components/Header";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    title: "Kivio - Your Personal YouTube Feed",
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content: "Kivio is a minimal YouTube client. Manage your channels, track history and discover new videos with ease.",
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
        content: "Track your YouTube history and manage your favorite channels in one place.",
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

function AppError({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="h-[90vh] flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-lg mx-auto">
      <div className="size-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-2">
         <span className="text-4xl font-bold">!</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          {error?.message || "An unexpected error occurred. Please try again or refresh the page."}
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 shadow-lg shadow-primary/20 cursor-pointer"
        >
          Refresh Page
        </button>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-secondary/40 text-foreground rounded-full font-semibold hover:bg-secondary cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function PageNotFound() {
  return (
    <div className="h-[90vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
       <img src="/logo.png" alt="Kivio" className="size-24 opacity-10 grayscale p-4 bg-black dark:bg-white rounded-4xl mb-2" />
       <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tighter italic">404</h2>
        <h3 className="text-xl font-bold">Page Not Found</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link
        to="/"
        className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 shadow-2xl"
      >
        Go Home
      </Link>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased overflow-y-hidden">
        <Header />
        <main className="h-[calc(100vh-3rem)] overflow-y-auto custom-scrollbar scrollbar-gutter-[stable]">
          {children}
        </main>

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
