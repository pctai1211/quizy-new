"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { importStudents, type ImportResult } from "@/lib/actions/students";

// Minimal RFC 4180 CSV parser (quoted fields, escaped "" quotes, \r\n or \n).
// Avoids pulling in a dependency for a 3-column file.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, "name" | "email" | "batch_name"> = {
  name: "name",
  "student name": "name",
  "student_name": "name",
  email: "email",
  "student email": "email",
  "student_email": "email",
  batch: "batch_name",
  batch_name: "batch_name",
  "batch name": "batch_name",
};

interface ParsedRow {
  name: string;
  email: string;
  batch_name: string;
}

export function StudentsImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParseError(null);
    setResult(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setResult(null);
    setFileName(file.name);

    const text = await file.text();
    const table = parseCsv(text);

    if (table.length < 2) {
      setParseError("The file has no data rows.");
      return;
    }

    const header = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
    const columnIndex: Partial<Record<"name" | "email" | "batch_name", number>> = {};
    header.forEach((cell, index) => {
      const key = HEADER_ALIASES[cell];
      if (key) columnIndex[key] = index;
    });

    const missing = (["name", "email", "batch_name"] as const).filter((key) => columnIndex[key] === undefined);
    if (missing.length > 0) {
      setParseError(`Missing column(s): ${missing.join(", ")}. Expected headers: name, email, batch.`);
      return;
    }

    const rows: ParsedRow[] = table.slice(1).map((cells) => ({
      name: (cells[columnIndex.name!] ?? "").trim(),
      email: (cells[columnIndex.email!] ?? "").trim(),
      batch_name: (cells[columnIndex.batch_name!] ?? "").trim(),
    }));

    startTransition(async () => {
      const res = await importStudents(rows);
      setResult(res);
      if (res.success) onSuccess();
    });
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Import CSV
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import students</DialogTitle>
            <DialogDescription>
              Upload a CSV with <span className="font-medium text-foreground">name</span>,{" "}
              <span className="font-medium text-foreground">email</span>, and{" "}
              <span className="font-medium text-foreground">batch</span> columns. Existing students
              (matched by email) are updated; new emails are added.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-50"
            />

            {fileName && !parseError && !result && !isPending && (
              <p className="text-xs text-muted">Selected: {fileName}</p>
            )}
            {isPending && <p className="text-xs text-muted">Importing...</p>}
            {parseError && <p className="text-xs text-destructive">{parseError}</p>}

            {result && (
              <div className="rounded-md border border-border p-3 text-xs">
                {result.success ? (
                  <p className="text-success">Imported {result.imported} student{result.imported === 1 ? "" : "s"}.</p>
                ) : (
                  <p className="text-destructive">{result.error}</p>
                )}
                {result.skipped.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-muted">
                      Skipped {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"}:
                    </p>
                    <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-muted">
                      {result.skipped.slice(0, 20).map((s, i) => (
                        <li key={i}>
                          {s.row.email || s.row.name || "(blank row)"} — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
