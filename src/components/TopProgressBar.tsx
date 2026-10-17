import { useEffect, useState, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "#/lib/utils";

export default function TopProgressBar() {
  const isNavigating = useRouterState({
    select: (s) => s.status === "pending",
  });

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isNavigating) {
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);

      setIsFading(false);
      setIsVisible(true);
      setProgress((prev) => (prev > 0 && prev < 90 ? prev : 15));

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 94) return prev;
          let inc = 0;
          if (prev < 30) inc = Math.random() * 8 + 4;
          else if (prev < 60) inc = Math.random() * 5 + 2;
          else if (prev < 80) inc = Math.random() * 3 + 1;
          else if (prev < 90) inc = Math.random() * 1.5 + 0.5;
          else inc = 0.2;
          return Math.min(94, prev + inc);
        });
      }, 160);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (isVisible) {
        setProgress(100);
        finishTimeoutRef.current = setTimeout(() => {
          setIsFading(true);
          cleanupTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            setIsFading(false);
            setProgress(0);
          }, 300);
        }, 200);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
  }, [isNavigating]);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none transition-opacity duration-300",
        isFading ? "opacity-0" : "opacity-100",
      )}
    >
      <div
        className="h-full bg-primary transition-[width] ease-out duration-200 relative shadow-[0_0_8px_var(--color-primary)]"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/20 to-white/60 blur-[1px]" />
      </div>
    </div>
  );
}
