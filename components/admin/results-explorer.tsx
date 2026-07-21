"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Download, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";
import { formatDate } from "@/lib/utils";
import type { Batch, Quiz, SubmissionWithQuiz } from "@/lib/types";

interface ResultsExplorerProps {
  submissions: SubmissionWithQuiz[];
  quizzes: Quiz[];
  batches: Batch[];
  total: number;
  page: number;
  pageSize: number;
}

const ALL = "__all__";

export function ResultsExplorer({
  submissions,
  quizzes,
  batches,
  total,
  page,
  pageSize,
}: ResultsExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === ALL) next.delete(key);
      else next.set(key, value);
    });
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(nextPage));
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const exportHref = (() => {
    const params = new URLSearchParams();
    const quizId = searchParams.get("quiz");
    const batchName = searchParams.get("batch");
    if (quizId) params.set("quiz_id", quizId);
    if (batchName) params.set("batch_name", batchName);
    return `/api/export?${params.toString()}`;
  })();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search name or email"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateParams({ q: search });
              }}
              onBlur={() => updateParams({ q: search })}
            />
          </div>

          <Select
            value={searchParams.get("quiz") ?? ALL}
            onValueChange={(value) => updateParams({ quiz: value })}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All quizzes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All quizzes</SelectItem>
              {quizzes.map((quiz) => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get("batch") ?? ALL}
            onValueChange={(value) => updateParams({ batch: value })}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All batches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All batches</SelectItem>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.name}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="secondary" asChild>
          <a href={exportHref}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No results found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <>
          <div className={`rounded-lg border border-border ${isPending ? "opacity-60" : ""}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted">{row.email}</TableCell>
                    <TableCell className="text-muted">{row.batch_name}</TableCell>
                    <TableCell className="text-muted">{row.quiz_title}</TableCell>
                    <TableCell>
                      {row.score}/{row.total_points}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.percentage >= 50 ? "success" : "muted"}>
                        {row.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">{formatDate(row.submitted_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isPending}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isPending}
                onClick={() => goToPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
