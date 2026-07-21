import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const batchName = searchParams.get("batch_name");

  let query = supabase
    .from("submissions")
    .select("name, email, batch_name, score, total_points, percentage, submitted_at, quizzes(title)")
    .order("submitted_at", { ascending: false });

  if (quizId) query = query.eq("quiz_id", quizId);
  if (batchName) query = query.eq("batch_name", batchName);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "Student",
    "Email",
    "Batch",
    "Quiz",
    "Score",
    "Total Points",
    "Percentage",
    "Submitted At",
  ];

  const rows = (data ?? []).map((row) => {
    const quizTitle = Array.isArray(row.quizzes)
      ? row.quizzes[0]?.title ?? ""
      : (row.quizzes as { title: string } | null)?.title ?? "";
    return [
      row.name,
      row.email,
      row.batch_name,
      quizTitle,
      row.score,
      row.total_points,
      `${row.percentage}%`,
      new Date(row.submitted_at).toISOString(),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quizy-results-${Date.now()}.csv"`,
    },
  });
}
