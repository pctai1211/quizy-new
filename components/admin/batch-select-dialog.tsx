"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface BatchSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  batchNames: string[];
  defaultSelected: string[];
  confirmLabel: string;
  onConfirm: (batchNames: string[]) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

// Shared batch-picker used by both the publish and activate panels — same
// checkbox-list shape, different action wired up by the caller.
export function BatchSelectDialog({
  open,
  onOpenChange,
  title,
  description,
  batchNames,
  defaultSelected,
  confirmLabel,
  onConfirm,
  onSuccess,
}: BatchSelectDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handle = () => {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(Array.from(selected));
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setSelected(new Set(defaultSelected));
          setError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {batchNames.length === 0 ? (
          <p className="text-sm text-muted">No batches yet — add students or a batch first.</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {batchNames.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm"
              >
                <Checkbox checked={selected.has(name)} onCheckedChange={() => toggle(name)} />
                <Label className="mb-0 cursor-pointer font-normal">{name}</Label>
              </label>
            ))}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        <Button className="mt-4 w-full" onClick={handle} disabled={isPending || batchNames.length === 0}>
          {isPending ? "Saving..." : confirmLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
