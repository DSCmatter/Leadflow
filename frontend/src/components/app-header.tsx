"use client";

import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="border-t-[3px] border-t-volt bg-ink text-paper">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-volt text-ink">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-[26px] leading-none tracking-tight">
            LeadFlow
          </span>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          size="lg"
          className="rounded-full bg-volt font-semibold text-ink hover:bg-volt/85"
        >
          <Plus aria-hidden="true" />
          Add New Lead
        </Button>
      </div>
    </header>
  );
}
