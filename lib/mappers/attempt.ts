export function nestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type ProfileLite = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export function studentDisplayFromJoin(students: unknown): {
  name: string;
  email: string;
  class_names: string;
} {
  const student = nestedOne(students as Record<string, unknown> | Record<string, unknown>[] | null);
  const profile = nestedOne(student?.profiles as ProfileLite | ProfileLite[] | null);
  const memberships = Array.isArray(student?.class_students) ? student.class_students : [];
  const classNames = memberships
    .map((membership) => nestedOne((membership as { classes?: unknown }).classes as { name?: string } | { name?: string }[] | null)?.name)
    .filter((name): name is string => Boolean(name));

  const email = profile?.email ?? "";
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email || "Student";

  return {
    name,
    email,
    class_names: classNames.join(", "),
  };
}
