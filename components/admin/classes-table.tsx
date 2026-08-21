"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ClassForm } from "@/components/admin/class-form";
import { createClass, updateClass, deleteClass } from "@/lib/actions/classes";
import { formatDate } from "@/lib/utils";
import type { Class } from "@/lib/types";

export function ClassesTable({ classes }: { classes: Class[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New class
        </Button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No classes yet"
          description="Create a class so students can belong to one or more cohorts."
          action={<Button onClick={() => setCreateOpen(true)}>Create class</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((classItem) => (
                <TableRow key={classItem.id}>
                  <TableCell className="font-medium">{classItem.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted">
                    {classItem.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={classItem.active ? "success" : "muted"}>
                      {classItem.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">{formatDate(classItem.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(classItem)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Delete class"
                        description={`This will permanently delete "${classItem.name}" and remove its student memberships.`}
                        onConfirm={async () => {
                          await deleteClass(classItem.id);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New class</DialogTitle>
            <DialogDescription>
              Students can join multiple classes. Quizzes can be assigned per class later.
            </DialogDescription>
          </DialogHeader>
          <ClassForm
            onSubmit={createClass}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>Update this class&apos;s details.</DialogDescription>
          </DialogHeader>
          {editing && (
            <ClassForm
              classItem={editing}
              onSubmit={(formData) => updateClass(editing.id, formData)}
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
