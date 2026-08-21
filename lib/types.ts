export type UserRole = "admin" | "student";

export type DifficultyLevel =
  | "easy"
  | "medium"
  | "hard";

export type QuizStatus =
  | "draft"
  | "published"
  | "archived";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "short_answer"
  | "open_ended";

export type AssignmentStatus =
  | "assigned"
  | "started"
  | "completed"
  | "cancelled";

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "graded"
  | "cancelled";

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Class — kept only for transitional UI that still says "batch". */
export interface Batch {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Class {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_code: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
  name?: string;
  classes?: Pick<Class, "id" | "name" | "active">[];
  class_ids?: string[];
  /** @deprecated use classes[] */
  batch_name?: string;
}

export interface StudentWithProfile extends Student {
  name: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  classes: Pick<Class, "id" | "name" | "active">[];
  class_ids: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;

  subject_id: string | null;
  category_id: string | null;

  difficulty: DifficultyLevel;
  status: QuizStatus;
  is_public: boolean;

  duration_minutes: number | null;
  max_attempts: number;

  created_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface QuizWithMeta extends Quiz {
  assignment_summary: string | null;
  question_count: number;
  attempt_count: number;
}

export interface Question {
  id: string;
  quiz_id: string;
  question: string;
  type: QuestionType;
  points: number;
  sort_order: number;
  explanation?: string | null;
  options?: QuestionOption[];
  created_at?: string;
  updated_at?: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
  created_at?: string;
}

export interface PublicQuestion {
  id: string;
  quiz_id?: string;
  question: string;
  type: QuestionType;
  points: number;
  sort_order: number;
  options: Array<{ id: string; option_text: string; sort_order: number }>;
}

export interface PublicQuiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  questions: PublicQuestion[];
}

export type QuizAnswerState = Record<string, string | string[]>;

export interface QuizAssignment {
  id: string;
  quiz_id: string;
  student_id: string;
  assigned_by: string | null;
  assigned_at: string;
  available_from: string | null;
  due_at: string | null;
  status: AssignmentStatus;
  notes: string | null;
}

export interface QuizClassAssignment {
  id: string;
  quiz_id: string;
  class_id: string;
  assigned_by: string | null;
  assigned_at: string;
  available_from: string | null;
  due_at: string | null;
  status: AssignmentStatus;
  notes: string | null;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  status: AttemptStatus;

  started_at: string;
  submitted_at: string | null;

  score: number;
  total_points: number;
  percentage: number;

  graded_by: string | null;
  graded_at: string | null;

  feedback: string | null;
}
export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;

  selected_option_ids: string[] | null;
  text_answer: string | null;

  is_correct: boolean | null;
  points_awarded: number;

  grader_feedback: string | null;

  graded_by: string | null;
  graded_at: string | null;

  created_at: string;
}

export interface AttemptWithQuiz {
  id: string;
  quiz_id: string;
  name: string;
  email: string;
  class_names: string;
  score: number;
  total_points: number;
  percentage: number;
  submitted_at: string | null;
  quiz_title: string;
  status: AttemptStatus;
}

/** @deprecated Use AttemptWithQuiz */
export type SubmissionWithQuiz = AttemptWithQuiz;