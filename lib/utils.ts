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

export function formatDuration(minutes: number | null | undefined): string {
  const safeMinutes = Number(minutes ?? 0);
  if (safeMinutes <= 0) return "0 min";
  if (safeMinutes < 60) return `${safeMinutes} min`;
  const hrs = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return rest === 0 ? `${hrs} hr` : `${hrs} hr ${rest} min`;
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, "")
    .replace(/\s+/g, " ");
}
