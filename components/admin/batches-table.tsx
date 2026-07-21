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
import { BatchForm } from "@/components/admin/batch-form";
import { createBatch, updateBatch, deleteBatch } from "@/lib/actions/batches";
import { formatDate } from "@/lib/utils";
import type { Batch } from "@/lib/types";

export function BatchesTable({ batches }: { batches: Batch[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New batch
        </Button>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches yet"
          description="Create a batch to group quizzes and students, like a cohort or class."
          action={<Button onClick={() => setCreateOpen(true)}>Create batch</Button>}
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
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted">
                    {batch.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={batch.active ? "success" : "muted"}>
                      {batch.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">{formatDate(batch.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(batch)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Delete batch"
                        description={`This will permanently delete "${batch.name}". Quizzes linked to it will lose their batch reference.`}
                        onConfirm={async () => {
                          await deleteBatch(batch.id);
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
            <DialogTitle>New batch</DialogTitle>
            <DialogDescription>Group quizzes and students under a cohort.</DialogDescription>
          </DialogHeader>
          <BatchForm
            onSubmit={createBatch}
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
            <DialogTitle>Edit batch</DialogTitle>
            <DialogDescription>Update this batch&apos;s details.</DialogDescription>
          </DialogHeader>
          {editing && (
            <BatchForm
              batch={editing}
              onSubmit={(formData) => updateBatch(editing.id, formData)}
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
