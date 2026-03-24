import { Link, useRouterState } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";
import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "#/lib/utils";
import UserDropdown from "./user-dropdown";

const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 350,
  damping: 50,
  mass: 2,
};

const links = [
  { path: "/", title: "Home" },
  { path: "/channels", title: "Channels" },
  { path: "/history", title: "History" },
] as const;

export default function Header() {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  const highlightedPath = hoveredPath ?? currentPath;

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-4 py-1 border-b border-border bg-background">
      <nav className="flex justify-between items-center gap-y-2 py-1 sm:py-2">
        <h2 className="tracking-tight">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg sm:text-2xl font-extrabold text-primary group"
          >
            <img src="/logo.png" alt="Kivio" className="w-8 h-10" />
            {/* <span className="group-hover:opacity-80">Kiv/io</span> */}
          </Link>
        </h2>

        <ul className="flex gap-3 sm:gap-16 text-xs md:text-base font-semibold">
          {links.map((link) => {
            const isActive = currentPath === link.path;
            const isHighlighted = highlightedPath === link.path;

            return (
              <li
                key={link.path}
                className={cn(
                  "relative py-1 rounded-lg cursor-pointer",
                  isActive ? "text-primary font-bold" : "hover:text-primary",
                )}
                onMouseEnter={() => setHoveredPath(link.path)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                {isHighlighted && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-secondary/50 rounded-lg -z-10"
                    transition={SPRING_CONFIG}
                  />
                )}
                <Link to={link.path} className="px-2 py-1">
                  {link.title}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserDropdown />
        </div>
      </nav>
    </header>
  );
}
