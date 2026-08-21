"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MultiSelectDialog } from "@/components/admin/multi-select-dialog";
import {
  assignQuizToClasses,
  assignQuizToStudents,
  removeClassAssignment,
  removeStudentAssignment,
} from "@/lib/actions/assignments";
import { formatDate } from "@/lib/utils";
import type { Class, Quiz, Student } from "@/lib/types";

export interface ClassAssignmentRow {
  id: string;
  class_id: string;
  class_name: string;
  available_from: string | null;
  due_at: string | null;
  status: string;
  notes: string | null;
}

export interface StudentAssignmentRow {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  available_from: string | null;
  due_at: string | null;
  status: string;
  notes: string | null;
}

interface QuizAssignPanelProps {
  quiz: Quiz;
  classes: Class[];
  students: Student[];
  classAssignments: ClassAssignmentRow[];
  studentAssignments: StudentAssignmentRow[];
}

function scheduleFormData(availableFrom: string, dueAt: string, notes: string) {
  const formData = new FormData();
  if (availableFrom) formData.set("available_from", availableFrom);
  if (dueAt) formData.set("due_at", dueAt);
  if (notes.trim()) formData.set("notes", notes.trim());
  return formData;
}

function windowLabel(availableFrom: string | null, dueAt: string | null) {
  if (!availableFrom && !dueAt) return "Always available";
  if (availableFrom && dueAt) return `${formatDate(availableFrom)} → ${formatDate(dueAt)}`;
  if (availableFrom) return `From ${formatDate(availableFrom)}`;
  return `Due ${formatDate(dueAt!)}`;
}

export function QuizAssignPanel({
  quiz,
  classes,
  students,
  classAssignments,
  studentAssignments,
}: QuizAssignPanelProps) {
  const router = useRouter();
  const [classOpen, setClassOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");

  const assignedClassIds = useMemo(
    () => new Set(classAssignments.map((row) => row.class_id)),
    [classAssignments]
  );
  const assignedStudentIds = useMemo(
    () => new Set(studentAssignments.map((row) => row.student_id)),
    [studentAssignments]
  );

  const classOptions = classes
    .filter((item) => item.active && !assignedClassIds.has(item.id))
    .map((item) => ({
      id: item.id,
      label: item.name,
      description: item.description ?? undefined,
    }));

  const studentOptions = students
    .filter((item) => item.active && !assignedStudentIds.has(item.id))
    .map((item) => ({
      id: item.id,
      label: item.name ?? "Student",
      description: [item.email, (item.classes ?? []).map((c) => c.name).join(", ")]
        .filter(Boolean)
        .join(" · "),
    }));

  const formData = () => scheduleFormData(availableFrom, dueAt, notes);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Assignment window</p>
        <p className="mt-1 text-xs text-muted">
          Applied to the next class or student assignment. Leave blank to keep the quiz
          available as soon as it is assigned. Assigning a draft quiz publishes it so
          students can see it.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="available_from">Available from</Label>
            <Input
              id="available_from"
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="due_at">Due at</Label>
            <Input
              id="due_at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal note for this assignment"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted" />
                <h3 className="text-sm font-semibold">Classes</h3>
                <Badge variant="muted">{classAssignments.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                Every student currently in the class can take this quiz.
              </p>
            </div>
            <Button size="sm" onClick={() => setClassOpen(true)}>
              <Plus className="h-4 w-4" />
              Assign class
            </Button>
          </div>

          {classAssignments.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted">
              Not assigned to any class yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {classAssignments.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{row.class_name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {windowLabel(row.available_from, row.due_at)}
                    </p>
                    {row.notes ? <p className="mt-1 text-xs text-muted">{row.notes}</p> : null}
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    title="Remove class assignment"
                    description={`Students in "${row.class_name}" will no longer see this quiz from the class assignment. Direct student assignments are unchanged.`}
                    confirmLabel="Remove"
                    onConfirm={async () => {
                      await removeClassAssignment(quiz.id, row.id);
                      router.refresh();
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted" />
                <h3 className="text-sm font-semibold">Students</h3>
                <Badge variant="muted">{studentAssignments.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                Extra assignments for individuals, even if they are not in an assigned class.
              </p>
            </div>
            <Button size="sm" onClick={() => setStudentOpen(true)}>
              <Plus className="h-4 w-4" />
              Assign student
            </Button>
          </div>

          {studentAssignments.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted">
              No individual student assignments yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {studentAssignments.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{row.student_name}</p>
                    <p className="text-xs text-muted">{row.student_email}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {windowLabel(row.available_from, row.due_at)}
                    </p>
                    {row.notes ? <p className="mt-1 text-xs text-muted">{row.notes}</p> : null}
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    title="Remove student assignment"
                    description={`${row.student_name} will lose this direct assignment. They can still take the quiz if one of their classes is assigned.`}
                    confirmLabel="Remove"
                    onConfirm={async () => {
                      await removeStudentAssignment(quiz.id, row.id);
                      router.refresh();
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MultiSelectDialog
        open={classOpen}
        onOpenChange={setClassOpen}
        title="Assign to classes"
        description="Students enrolled in the selected classes will see this quiz once it is published."
        options={classOptions}
        confirmLabel="Assign classes"
        emptyMessage="No remaining active classes to assign. Create a class first, or all active classes are already assigned."
        searchPlaceholder="Search classes"
        onConfirm={(ids) => assignQuizToClasses(quiz.id, ids, formData())}
        onSuccess={() => {
          setClassOpen(false);
          router.refresh();
        }}
      />

      <MultiSelectDialog
        open={studentOpen}
        onOpenChange={setStudentOpen}
        title="Assign to students"
        description="Assign this quiz to individual students in addition to, or instead of, a class."
        options={studentOptions}
        confirmLabel="Assign students"
        emptyMessage="No remaining active students to assign."
        searchPlaceholder="Search name, email, or class"
        onConfirm={(ids) => assignQuizToStudents(quiz.id, ids, formData())}
        onSuccess={() => {
          setStudentOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
