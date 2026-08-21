import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nestedOne, studentDisplayFromJoin } from "@/lib/mappers/attempt";

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get("quiz_id");
  const classId = searchParams.get("class_id");

  let studentIds: string[] | null = null;
  if (classId) {
    const { data: members } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", classId);
    studentIds = (members ?? []).map((row) => row.student_id);
    if (studentIds.length === 0) {
      const csv = ["Student,Email,Classes,Quiz,Score,Total Points,Percentage,Submitted At"].join(
        "\n"
      );
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="quizy-results-${Date.now()}.csv"`,
        },
      });
    }
  }

  let query = supabase
    .from("quiz_attempts")
    .select(
      "score, total_points, percentage, submitted_at, quizzes(title), students(profiles(email, first_name, last_name), class_students(classes(name)))"
    )
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false });

  if (quizId) query = query.eq("quiz_id", quizId);
  if (studentIds) query = query.in("student_id", studentIds);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "Student",
    "Email",
    "Classes",
    "Quiz",
    "Score",
    "Total Points",
    "Percentage",
    "Submitted At",
  ];

  const rows = (data ?? []).map((row) => {
    const quizTitle = nestedOne(row.quizzes)?.title ?? "";
    const student = studentDisplayFromJoin(row.students);

    return [
      student.name,
      student.email,
      student.class_names.replace(/, /g, "; "),
      quizTitle,
      row.score,
      row.total_points,
      `${row.percentage}%`,
      row.submitted_at ? new Date(row.submitted_at).toISOString() : "",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quizy-results-${Date.now()}.csv"`,
    },
  });
}
