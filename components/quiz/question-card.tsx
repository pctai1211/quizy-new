"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import type { PublicQuestion } from "@/lib/types";

interface QuestionCardProps {
  question: PublicQuestion;
  index: number;
  total: number;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

export function QuestionCard({ question, index, total, value, onChange }: QuestionCardProps) {
  const isChoice = question.type === "single_choice" || question.type === "multiple_choice";

  return (
    <div className="mx-auto w-full max-w-[768px]">
      <p className="text-xs font-medium text-muted">
        Question {index + 1} of {total}
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-snug text-foreground sm:text-2xl">
        {question.question}
      </h2>

      <div className="mt-8">
        {isChoice ? (
          <div className="grid grid-cols-1 gap-3">
            {question.options.map((option, i) => {
              const selected = Array.isArray(value)
                ? value.includes(option.id)
                : value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    onChange(
                      question.type === "multiple_choice"
                        ? selected
                          ? (Array.isArray(value) ? value.filter((item) => item !== option.id) : [])
                          : [...(Array.isArray(value) ? value : []), option.id]
                        : option.id
                    )
                  }
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition-colors",
                    selected
                      ? "border-primary bg-orange-50 text-foreground"
                      : "border-border bg-white text-foreground hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-medium",
                      selected ? "bg-primary text-white" : "bg-gray-100 text-muted"
                    )}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option.option_text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <Textarea
            value={Array.isArray(value) ? value.join(", ") : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.type === "open_ended" ? "Write your response" : "Type your answer"}
            className={question.type === "open_ended" ? "min-h-52 text-base" : "min-h-32 text-base"}
            autoFocus
          />
        )}
      </div>
    </div>
  );
}
