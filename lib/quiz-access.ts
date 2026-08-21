export type AssignmentWindow = {
  available_from: string | null;
  due_at: string | null;
  status: string;
};

export function isAssignmentWindowOpen(
  available_from: string | null,
  due_at: string | null,
  now = new Date()
): boolean {
  const t = now.getTime();
  if (available_from && new Date(available_from).getTime() > t) return false;
  if (due_at && new Date(due_at).getTime() <= t) return false;
  return true;
}

export function isActiveAssignment(row: AssignmentWindow, now = new Date()): boolean {
  if (row.status === "cancelled") return false;
  return isAssignmentWindowOpen(row.available_from, row.due_at, now);
}

export function hasOpenAssignment(rows: AssignmentWindow[], now = new Date()): boolean {
  return rows.some((row) => isActiveAssignment(row, now));
}

export function earliestDueAt(rows: AssignmentWindow[]): string | null {
  const dues = rows
    .filter((row) => isActiveAssignment(row))
    .map((row) => row.due_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dues[0] ?? null;
}

export function isUpcomingAssignment(row: AssignmentWindow, now = new Date()): boolean {
  if (row.status === "cancelled") return false;
  return Boolean(row.available_from && new Date(row.available_from).getTime() > now.getTime());
}

export function canTakeAssignedQuiz(
  rows: AssignmentWindow[],
  isPublic: boolean,
  now = new Date()
): boolean {
  if (rows.length > 0) return hasOpenAssignment(rows, now);
  return isPublic;
}
