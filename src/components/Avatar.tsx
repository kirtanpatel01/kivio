import { useState } from "react";
import { cn } from "#/lib/utils";
import { IconUser } from "@tabler/icons-react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

// Generate a deterministic soft background color based on name/handle
function getAvatarBg(name?: string | null) {
  if (!name) return "bg-primary/15 text-primary border-primary/20";
  const colors = [
    "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
    "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
    "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name?: string | null) {
  if (!name) return "";
  const cleaned = name.replace(/^@/, "").trim();
  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function Avatar({
  src,
  alt,
  name,
  className,
  fallbackClassName,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
  }

  const initials = getInitials(name || alt);
  const colorClass = getAvatarBg(name || alt);

  // If no src, or if loading failed (e.g. 404, 429, broken), render sleek initials badge
  if (!src || hasError) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center font-bold select-none shrink-0 border uppercase tracking-wider text-xs",
          colorClass,
          fallbackClassName || className,
        )}
        title={name || alt || undefined}
      >
        {initials || <IconUser size={16} className="opacity-70" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name || "Avatar"}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
