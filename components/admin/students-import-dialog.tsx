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
import { importStudents, type ImportResult, type ImportRow } from "@/lib/actions/students";

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

type ColumnKey =
  | "name"
  | "first_name"
  | "last_name"
  | "email"
  | "classes"
  | "password"
  | "student_code"
  | "phone";

const HEADER_ALIASES: Record<string, ColumnKey> = {
  name: "name",
  "student name": "name",
  student_name: "name",
  first_name: "first_name",
  "first name": "first_name",
  last_name: "last_name",
  "last name": "last_name",
  email: "email",
  "student email": "email",
  student_email: "email",
  classes: "classes",
  class: "classes",
  batch: "classes",
  batch_name: "classes",
  "batch name": "classes",
  password: "password",
  student_code: "student_code",
  code: "student_code",
  phone: "phone",
};

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
    const columnIndex: Partial<Record<ColumnKey, number>> = {};
    header.forEach((cell, index) => {
      const key = HEADER_ALIASES[cell];
      if (key) columnIndex[key] = index;
    });

    if (columnIndex.email === undefined) {
      setParseError("Missing column: email.");
      return;
    }

    const hasName =
      columnIndex.name !== undefined ||
      (columnIndex.first_name !== undefined && columnIndex.last_name !== undefined);

    if (!hasName) {
      setParseError("Provide either name, or first_name + last_name columns.");
      return;
    }

    const rows: ImportRow[] = table.slice(1).map((cells) => ({
      name: columnIndex.name !== undefined ? (cells[columnIndex.name] ?? "").trim() : undefined,
      first_name:
        columnIndex.first_name !== undefined
          ? (cells[columnIndex.first_name] ?? "").trim()
          : undefined,
      last_name:
        columnIndex.last_name !== undefined
          ? (cells[columnIndex.last_name] ?? "").trim()
          : undefined,
      email: (cells[columnIndex.email!] ?? "").trim(),
      password:
        columnIndex.password !== undefined
          ? (cells[columnIndex.password] ?? "").trim()
          : undefined,
      student_code:
        columnIndex.student_code !== undefined
          ? (cells[columnIndex.student_code] ?? "").trim()
          : undefined,
      phone:
        columnIndex.phone !== undefined ? (cells[columnIndex.phone] ?? "").trim() : undefined,
      classes:
        columnIndex.classes !== undefined
          ? (cells[columnIndex.classes] ?? "").trim()
          : undefined,
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
              CSV needs <span className="font-medium text-foreground">email</span> plus{" "}
              <span className="font-medium text-foreground">name</span> (or first/last). Optional:{" "}
              <span className="font-medium text-foreground">classes</span> (comma-separated names),
              password, student_code, phone. Existing emails are updated.
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
                  <p className="text-success">
                    Imported {result.imported} student{result.imported === 1 ? "" : "s"}.
                  </p>
                ) : (
                  <p className="text-destructive">{result.error}</p>
                )}
                {result.skipped.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-muted">
                      Skipped {result.skipped.length} row
                      {result.skipped.length === 1 ? "" : "s"}:
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
