import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { QuizForm } from "@/components/admin/quiz-form";
import { QuestionBuilder } from "@/components/admin/question-builder";
import { QuizPublishPanel } from "@/components/admin/quiz-publish-panel";
import { QuizActivatePanel } from "@/components/admin/quiz-activate-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { Question, Quiz } from "@/lib/types";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quiz }, { data: batches }, { data: questions }] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", id).single(),
    supabase.from("batches").select("name").order("name", { ascending: true }),
    supabase
      .from("questions")
      .select("*, options:question_options(*)")
      .eq("quiz_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!quiz) notFound();

  const batchNames = (batches ?? []).map((b) => b.name);

  return (
    <div>
      <PageHeader
        title={quiz.title}
        description="Manage quiz details and questions."
        action={
          quiz.published && (
            <Button variant="secondary" asChild>
              <Link href={`/quiz/${quiz.id}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                View public link
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <QuizPublishPanel quiz={quiz as Quiz} batchNames={batchNames} />
        <QuizActivatePanel quiz={quiz as Quiz} />
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <QuestionBuilder quizId={quiz.id} questions={(questions as Question[]) ?? []} />
        </TabsContent>

        <TabsContent value="details">
          <QuizForm quiz={quiz as Quiz} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
