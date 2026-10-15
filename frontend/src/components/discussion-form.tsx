"use client";

import { useState } from "react";
import { toUtcIso } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface DiscussionFormValue {
  note: string;
  followUpAt: string | null;
}

export function DiscussionForm({
  onSave,
  saving,
}: {
  onSave: (value: DiscussionFormValue) => Promise<string | null>;
  saving: boolean;
}) {
  const [note, setNote] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (note.trim() === "") {
      setError("Please enter a discussion note.");
      return;
    }
    let followUpAt: string | null = null;
    if (schedule) {
      followUpAt = toUtcIso(date, time);
      if (followUpAt === null) {
        setError("Please provide both a valid follow-up date and time.");
        return;
      }
    }
    setError(null);
    // The parent performs the request; a returned string is an error message.
    // Values are preserved here so the user can retry after a failure.
    const failure = await onSave({ note: note.trim(), followUpAt });
    if (failure !== null) {
      setError(failure);
    } else {
      setNote("");
      setSchedule(false);
      setDate("");
      setTime("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Label htmlFor="discussion-note" className="sr-only">
        Log a new discussion
      </Label>
      <Textarea
        id="discussion-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Log a new discussion…"
        rows={3}
        className="resize-y border-ink/25 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus-visible:border-ink focus-visible:ring-ink/30"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium text-ink/80">
            <input
              type="checkbox"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
              className="h-4 w-4 rounded border-ink/30 accent-[#1c1813]"
            />
            Set Follow-up
          </Label>
          {schedule && (
            <>
              <Label className="sr-only" htmlFor="followup-date">
                Follow-up date
              </Label>
              <Input
                id="followup-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-auto border-ink/25 bg-white px-2 py-1.5 text-sm text-ink focus-visible:border-ink focus-visible:ring-ink/30"
              />
              <Label className="sr-only" htmlFor="followup-time">
                Follow-up time
              </Label>
              <Input
                id="followup-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-auto border-ink/25 bg-white px-2 py-1.5 text-sm text-ink focus-visible:border-ink focus-visible:ring-ink/30"
              />
            </>
          )}
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="bg-volt font-semibold text-ink shadow-[2px_2px_0_#1c1813] hover:bg-volt/85"
        >
          {saving ? "Saving…" : "Save Note"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
