"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  id: string;
  label: string;
  description?: string;
}

interface MultiSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  options: MultiSelectOption[];
  confirmLabel: string;
  emptyMessage: string;
  searchPlaceholder?: string;
  onConfirm: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

export function MultiSelectDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  confirmLabel,
  emptyMessage,
  searchPlaceholder = "Search",
  onConfirm,
  onSuccess,
}: MultiSelectDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handle = () => {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(Array.from(selected));
      if (result.success) {
        setSelected(new Set());
        setQuery("");
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
          setSelected(new Set());
          setQuery("");
          setError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="text-sm text-muted">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
            />
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted">No matches.</p>
              ) : (
                filtered.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.has(option.id)}
                      onCheckedChange={() => toggle(option.id)}
                    />
                    <span>
                      <Label className="mb-0 cursor-pointer font-normal">{option.label}</Label>
                      {option.description ? (
                        <p className="text-xs text-muted">{option.description}</p>
                      ) : null}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        <Button
          className="mt-4 w-full"
          onClick={handle}
          disabled={isPending || selected.size === 0}
        >
          {isPending ? "Saving..." : confirmLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
