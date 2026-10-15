"use client";

import { Bell } from "lucide-react";
import type { Lead } from "@/types/lead";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import {
  followUpLabel,
  formatRelative,
  isOverdue,
} from "@/lib/date-utils";

function LastNote({ lead }: { lead: Lead }) {
  if (!lead.latest_note) {
    return (
      <p className="font-display text-[15px] text-ink/40 italic">
        No discussions yet.
      </p>
    );
  }
  return (
    <p className="truncate text-sm text-ink/70">
      <span className="font-semibold text-ink">Last note — </span>
      {lead.latest_note}{" "}
      {lead.latest_discussion_at && (
        <span className="ml-1 text-xs whitespace-nowrap text-ink/40">
          {formatRelative(lead.latest_discussion_at)}
        </span>
      )}
    </p>
  );
}

function FollowUpChip({ followUpAt }: { followUpAt: string }) {
  const overdue = isOverdue(followUpAt);
  return (
    <Badge
      className={
        overdue
          ? "mt-2.5 gap-1 rounded-md border-red-600 bg-red-600 px-2 py-0.5 text-xs font-bold text-white"
          : "mt-2.5 gap-1 rounded-md border-ink bg-ink px-2 py-0.5 text-xs font-bold text-volt"
      }
    >
      <Bell aria-hidden="true" />
      {followUpLabel(followUpAt)}
    </Badge>
  );
}

export function LeadCard({
  lead,
  highlighted = false,
  onOpen,
}: {
  lead: Lead;
  highlighted?: boolean;
  onOpen: (lead: Lead) => void;
}) {
  return (
    <Card
      onClick={() => onOpen(lead)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(lead);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open details for ${lead.name}`}
      className={
        highlighted
          ? "cursor-pointer border-ink bg-cream p-4 shadow-[4px_4px_0_#1c1813] transition hover:-translate-y-0.5 hover:shadow-[5px_6px_0_#1c1813] focus-visible:outline-2 focus-visible:outline-ink"
          : "cursor-pointer border-ink/15 bg-cream p-4 shadow-[2px_2px_0_rgba(28,24,19,0.12)] transition hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-[3px_3px_0_rgba(28,24,19,0.25)] focus-visible:outline-2 focus-visible:outline-ink"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[21px] leading-tight tracking-tight text-ink">
          {lead.name}{" "}
          {lead.company && (
            <span className="font-sans text-sm font-normal text-ink/50">
              ({lead.company})
            </span>
          )}
        </h3>
        <StatusBadge status={lead.status} />
      </div>
      <div className="mt-1">
        <LastNote lead={lead} />
      </div>
      {lead.follow_up_at && <FollowUpChip followUpAt={lead.follow_up_at} />}
    </Card>
  );
}
