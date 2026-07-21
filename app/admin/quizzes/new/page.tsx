import { PageHeader } from "@/components/admin/page-header";
import { QuizForm } from "@/components/admin/quiz-form";

export default function NewQuizPage() {
  return (
    <div>
      <PageHeader title="New quiz" description="Set up the quiz details, then add questions." />
      <QuizForm />
    </div>
  );
}
