"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StudentForm } from "@/components/admin/student-form";
import { StudentsImportDialog } from "@/components/admin/students-import-dialog";
import { createStudent, updateStudent, deleteStudent } from "@/lib/actions/students";
import { formatDate } from "@/lib/utils";
import type { Class, Student } from "@/lib/types";

export function StudentsTable({
  students,
  classes,
}: {
  students: Student[];
  classes: Class[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((s) => {
      const name = (s.name ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const classText = (s.classes ?? []).map((c) => c.name).join(" ").toLowerCase();
      const code = (s.student_code ?? "").toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        classText.includes(query) ||
        code.includes(query)
      );
    });
  }, [students, search]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search name, email, or class"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <StudentsImportDialog onSuccess={() => router.refresh()} />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add student
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No students yet"
          description="Add a student with email/password, or import a CSV. Enroll them in one or more classes."
          action={<Button onClick={() => setCreateOpen(true)}>Add student</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search." />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="text-muted">{student.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(student.classes ?? []).length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        (student.classes ?? []).map((c) => (
                          <Badge key={c.id} variant="outline">
                            {c.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.active ? "success" : "muted"}>
                      {student.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">{formatDate(student.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(student)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Remove student"
                        description={`This will remove "${student.name}" and revoke their login access.`}
                        onConfirm={async () => {
                          await deleteStudent(student.id);
                          router.refresh();
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
            <DialogDescription>
              Creates a login account. Assign one or more classes below.
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            classes={classes}
            onSubmit={createStudent}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>Update profile, status, and class membership.</DialogDescription>
          </DialogHeader>
          {editing && (
            <StudentForm
              student={editing}
              classes={classes}
              onSubmit={(formData) => updateStudent(editing.id, formData)}
              onSuccess={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
