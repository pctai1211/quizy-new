import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { QuizForm } from "@/components/admin/quiz-form";
import { QuestionBuilder } from "@/components/admin/question-builder";
import { QuizStatusPanel } from "@/components/admin/quiz-status-panel";
import { QuizAssignPanel } from "@/components/admin/quiz-assign-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { mapStudentRow, type StudentQueryRow } from "@/lib/mappers/student";
import type { Class, Question, Quiz } from "@/lib/types";

type ProfileLite = {
  email: string;
  first_name: string | null;
  last_name: string | null;
};

type ClassAssignmentQuery = {
  id: string;
  class_id: string;
  available_from: string | null;
  due_at: string | null;
  status: string;
  notes: string | null;
  classes: { name: string } | { name: string }[] | null;
};

type StudentAssignmentQuery = {
  id: string;
  student_id: string;
  available_from: string | null;
  due_at: string | null;
  status: string;
  notes: string | null;
  students:
    | { profiles: ProfileLite | ProfileLite[] | null }
    | Array<{ profiles: ProfileLite | ProfileLite[] | null }>
    | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: quiz },
    { data: questions },
    { data: classRows },
    { data: studentRows },
    { data: classAssignmentRows },
    { data: studentAssignmentRows },
  ] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", id).single(),
    supabase
      .from("questions")
      .select("*, options:question_options(*)")
      .eq("quiz_id", id)
      .order("sort_order", { ascending: true }),
    supabase.from("classes").select("*").order("name", { ascending: true }),
    supabase
      .from("students")
      .select(
        `
        id,
        student_code,
        phone,
        active,
        created_at,
        updated_at,
        profiles ( email, first_name, last_name ),
        class_students ( classes ( id, name, active ) )
      `
      )
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("quiz_class_assignments")
      .select("id, class_id, available_from, due_at, status, notes, classes ( name )")
      .eq("quiz_id", id)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("quiz_assignments")
      .select(
        "id, student_id, available_from, due_at, status, notes, students ( profiles ( email, first_name, last_name ) )"
      )
      .eq("quiz_id", id)
      .order("assigned_at", { ascending: false }),
  ]);

  if (!quiz) notFound();

  const classAssignments = ((classAssignmentRows as ClassAssignmentQuery[] | null) ?? []).map(
    (row) => ({
      id: row.id,
      class_id: row.class_id,
      class_name: one(row.classes)?.name ?? "Class",
      available_from: row.available_from,
      due_at: row.due_at,
      status: row.status,
      notes: row.notes,
    })
  );

  const studentAssignments = (
    (studentAssignmentRows as StudentAssignmentQuery[] | null) ?? []
  ).map((row) => {
    const profile = one(one(row.students)?.profiles);
    const student_name =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Student";
    return {
      id: row.id,
      student_id: row.student_id,
      student_name,
      student_email: profile?.email ?? "",
      available_from: row.available_from,
      due_at: row.due_at,
      status: row.status,
      notes: row.notes,
    };
  });

  const canPreview = quiz.status === "published" && quiz.is_public;

  return (
    <div>
      <PageHeader
        title={quiz.title}
        description="Questions follow question/type + option is_correct. Assign the quiz to classes and/or individual students."
        action={
          canPreview ? (
            <Button variant="secondary" asChild>
              <Link href={`/quiz/${quiz.id}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                View public link
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6">
        <QuizStatusPanel quiz={quiz as Quiz} />
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="assign">Assign</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <QuestionBuilder quizId={quiz.id} questions={(questions as Question[]) ?? []} />
        </TabsContent>

        <TabsContent value="assign">
          <QuizAssignPanel
            quiz={quiz as Quiz}
            classes={(classRows as Class[]) ?? []}
            students={((studentRows as StudentQueryRow[] | null) ?? []).map(mapStudentRow)}
            classAssignments={classAssignments}
            studentAssignments={studentAssignments}
          />
        </TabsContent>

        <TabsContent value="details">
          <QuizForm quiz={quiz as Quiz} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
