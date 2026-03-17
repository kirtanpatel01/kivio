import { Link } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 border-b border-border bg-background">
      <nav className="flex justify-between items-center gap-y-2 py-2">
        <h2 className="tracking-tight">
          <Link to="/" className="text-2xl font-extrabold text-primary">
            Kivio
          </Link>
        </h2>

        <div className="flex gap-4 font-semibold">
          <Link
            to="/"
            className="hover:text-primary"
            activeProps={{ className: "text-primary" }}
          >
            Home
          </Link>
          <Link
            to="/channels"
            className="hover:text-primary"
            activeProps={{ className: "text-primary" }}
          >
            About
          </Link>
          <Link
            to="/history"
            className="hover:text-primary"
            activeProps={{ className: "text-primary" }}
          >
            History
          </Link>
        </div>
        <ThemeToggle />
      </nav>
    </header>
  );
}
