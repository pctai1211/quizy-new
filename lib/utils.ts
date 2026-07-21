import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hrs} hr` : `${hrs} hr ${rest} min`;
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, "")
    .replace(/\s+/g, " ");
}

// A quiz is attemptable right now only inside its 30-minute activation
// window, and only for the batches the admin activated it for. Computed
// on read (no cron): once active_until passes, this naturally goes false.
export function isQuizLive(
  quiz: { published: boolean; active_until: string | null; active_batches: string[] },
  batchName: string
): boolean {
  if (!quiz.published) return false;
  if (!quiz.active_until) return false;
  if (new Date(quiz.active_until).getTime() <= Date.now()) return false;
  return quiz.active_batches.includes(batchName);
}
