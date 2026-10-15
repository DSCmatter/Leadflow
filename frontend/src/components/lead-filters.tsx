"use client";

import { Search, X } from "lucide-react";
import { LEAD_STATUSES, type StatusFilter } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FILTERS: StatusFilter[] = ["All", ...LEAD_STATUSES];

export function LeadFilters({
  active,
  onChange,
  search,
  onSearchChange,
}: {
  active: StatusFilter;
  onChange: (filter: StatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold tracking-[0.18em] text-ink/60 uppercase">
          Filters
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter leads by status">
          {FILTERS.map((filter) => {
            const isActive = filter === active;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => onChange(filter)}
                aria-pressed={isActive}
                className={
                  isActive
                    ? "rounded-full border border-ink bg-ink px-4 py-1.5 text-sm font-semibold text-volt shadow-[2px_2px_0_rgba(28,24,19,0.25)]"
                    : "rounded-full border border-ink/25 bg-cream px-4 py-1.5 text-sm font-medium text-ink/80 transition hover:-translate-y-px hover:border-ink hover:shadow-[2px_2px_0_#1c1813] focus-visible:outline-2 focus-visible:outline-ink"
                }
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/40"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search leads by name…"
          aria-label="Search leads by name"
          className="border-ink/25 bg-cream py-2 pr-9 pl-9 text-sm text-ink placeholder:text-ink/35 focus-visible:border-ink focus-visible:ring-ink/30"
        />
        {search !== "" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-ink/40 hover:text-ink"
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
