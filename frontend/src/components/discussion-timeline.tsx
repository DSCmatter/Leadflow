"use client";

import { Flag } from "lucide-react";
import type { Discussion } from "@/types/discussion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatAbsolute, formatRelative } from "@/lib/date-utils";

export function DiscussionTimeline({ discussions }: { discussions: Discussion[] }) {
  if (discussions.length === 0) {
    return (
      <p className="py-6 text-center font-display text-lg text-ink/40 italic">
        No discussions yet. Log the first note below.
      </p>
    );
  }
  return (
    <ol className="space-y-5">
      {discussions.map((discussion, index) => (
        <li key={discussion.id} className="relative flex gap-3">
          <div className="flex flex-col items-center" aria-hidden="true">
            <span
              className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                index === 0
                  ? "bg-ink ring-4 ring-volt"
                  : "bg-ink/20"
              }`}
            />
            {index < discussions.length - 1 && (
              <span className="w-px flex-1 bg-ink/15" />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-xs font-medium text-ink/50">
              {formatAbsolute(discussion.created_at)}{" "}
              <span className="font-normal text-ink/35">
                ({formatRelative(discussion.created_at)})
              </span>
            </p>
            <Card className="mt-1 border-ink/15 bg-white p-3 shadow-[2px_2px_0_rgba(28,24,19,0.12)]">
              <p className="text-sm whitespace-pre-wrap text-ink/85">
                {discussion.note}
              </p>
              {discussion.follow_up_at && (
                <Badge className="mt-2 gap-1 rounded-md border-ink bg-ink px-2 py-0.5 text-xs font-bold text-volt">
                  <Flag aria-hidden="true" />
                  Follow-up set for: {formatAbsolute(discussion.follow_up_at)}
                </Badge>
              )}
            </Card>
          </div>
        </li>
      ))}
    </ol>
  );
}
