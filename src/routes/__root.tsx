import { HeadContent, Scripts, createRootRoute, useRouterState } from "@tanstack/react-router";
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

function AppError({ error }: { error: any }) {
  return (
    <div className="h-[80vh] flex items-center justify-center p-6 text-center">
      <p className="text-red-500 font-medium">
        Something went wrong: {error?.message || "An unexpected error occurred."}
      </p>
    </div>
  );
}


function PageNotFound() {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center p-6 text-center gap-4">
      <p className="text-xl font-bold italic tracking-tight uppercase">404 - Not Found</p>
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
        <Header />
        <main className={cn(
          "h-[calc(100vh-3rem)] custom-scrollbar scrollbar-gutter-[stable]",
          isShorts ? "overflow-y-hidden" : "overflow-y-auto"
        )}>
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
