import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";

type ThemeMode = "light" | "dark";

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(mode);
  document.documentElement.setAttribute("data-theme", mode);
  document.documentElement.style.colorScheme = mode;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode() as ThemeMode);

  useEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "d" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement).tagName,
        ) &&
        !(event.target as HTMLElement).isContentEditable
      ) {
        toggleMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  function toggleMode() {
    const nextMode: ThemeMode = mode === "light" ? "dark" : "light";
    setMode(nextMode);
    applyThemeMode(nextMode);
    window.localStorage.setItem("theme", nextMode);
  }

  const label = `Theme mode: ${mode}. Click to switch mode.`;

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="rounded-full sm:bg-secondary/60 sm:hover:bg-secondary sm:p-2 cursor-pointer"
    >
      {mode === "dark" ? <IconMoon size={16} /> : <IconSun size={16} />}
    </button>
  );
}
