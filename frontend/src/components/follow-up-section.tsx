"use client";

import { Pin } from "lucide-react";
import type { Lead } from "@/types/lead";
import { LeadCard } from "./lead-card";

export function FollowUpSection({
  leads,
  onOpen,
}: {
  leads: Lead[];
  onOpen: (lead: Lead) => void;
}) {
  if (leads.length === 0) return null;
  return (
    <section aria-label="Today's follow-ups">
      <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-ink/60 uppercase">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white">
          <Pin className="h-3 w-3" aria-hidden="true" />
        </span>
        Today&apos;s follow-ups
        <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} highlighted onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
