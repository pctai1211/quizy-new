"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  initialSeconds: number;
  onExpire: () => void;
  onTick?: (secondsLeft: number) => void;
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function QuizTimer({ initialSeconds, onExpire, onTick }: QuizTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const hasExpired = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        onTick?.(Math.max(0, next));
        if (next <= 0 && !hasExpired.current) {
          hasExpired.current = true;
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLow = secondsLeft <= 60;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium tabular-nums",
        isLow ? "bg-red-50 text-destructive" : "bg-gray-100 text-foreground"
      )}
    >
      <Clock className="h-3.5 w-3.5" strokeWidth={2} />
      {formatTime(secondsLeft)}
    </div>
  );
}
