"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { FollowUpSection } from "@/components/follow-up-section";
import { LeadCard } from "@/components/lead-card";
import { LeadDetailsDialog } from "@/components/lead-details-dialog";
import { LeadFilters } from "@/components/lead-filters";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { isPinnedFollowUp } from "@/lib/date-utils";
import type { Lead, StatusFilter } from "@/types/lead";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setLeads(await api.listLeads());
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Could not load leads.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "All" && lead.status !== statusFilter) return false;
      if (query !== "" && !lead.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [leads, statusFilter, search]);

  // Pinned follow-ups (today or overdue) are shown once, at the top, and
  // excluded from the regular list below — per the reference screenshot.
  const { pinned, regular } = useMemo(() => {
    const now = new Date();
    const pinnedLeads = filtered
      .filter((lead) => lead.follow_up_at && isPinnedFollowUp(lead.follow_up_at, now))
      .sort((a, b) => {
        const aOver = a.follow_up_at as string;
        const bOver = b.follow_up_at as string;
        return aOver.localeCompare(bOver);
      });
    const pinnedIds = new Set(pinnedLeads.map((lead) => lead.id));
    return {
      pinned: pinnedLeads,
      regular: filtered.filter((lead) => !pinnedIds.has(lead.id)),
    };
  }, [filtered]);

  const handleCreated = useCallback((lead: Lead) => {
    setLeads((previous) => [lead, ...previous]);
  }, []);

  const handleChanged = useCallback((updated: Lead) => {
    setLeads((previous) =>
      previous.map((lead) =>
        lead.id === updated.id
          ? {
              ...lead,
              ...updated,
              latest_note: updated.latest_note ?? lead.latest_note,
              latest_discussion_at:
                updated.latest_discussion_at ?? lead.latest_discussion_at,
            }
          : lead,
      ),
    );
  }, []);

  const openLead = useCallback((lead: Lead) => setSelectedId(lead.id), []);
  const searchingOrFiltering = statusFilter !== "All" || search.trim() !== "";

  return (
    <div className="min-h-screen">
      <AppHeader onAdd={() => setAddOpen(true)} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <LeadFilters
          active={statusFilter}
          onChange={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
        />

        {loading && (
          <p className="py-10 text-center font-display text-lg text-ink/50 italic">Loading leads…</p>
        )}

        {loadError && !loading && (
          <div className="rounded-md border border-ink bg-cream p-4 text-center shadow-[3px_3px_0_#1c1813]">
            <p role="alert" className="text-sm font-medium text-red-700">
              {loadError}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={loadLeads}
              className="mt-2 border-ink bg-cream text-ink hover:bg-ink hover:text-paper"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !loadError && (
          <>
            <FollowUpSection leads={pinned} onOpen={openLead} />

            <section aria-label="All leads">
              <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-ink/60 uppercase">
                All leads
                <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
              </h2>
              {regular.length === 0 ? (
                <div className="mt-3 rounded-md border border-dashed border-ink/30 bg-cream/60 p-8 text-center">
                  <p className="font-display text-lg text-ink/60 italic">
                    {leads.length === 0
                      ? "No leads yet. Click “Add New Lead” to create your first lead."
                      : searchingOrFiltering
                        ? "No leads match your search or filters."
                        : "Every lead is currently pinned above."}
                  </p>
                  {searchingOrFiltering && leads.length > 0 && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("All");
                      }}
                      className="mt-2 text-ink underline decoration-volt decoration-2 underline-offset-4 hover:text-ink/70"
                    >
                      Clear search and filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-3">
                  {regular.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onOpen={openLead} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {addOpen && (
        <AddLeadDialog onClose={() => setAddOpen(false)} onCreated={handleCreated} />
      )}
      {selectedId !== null && (
        <LeadDetailsDialog
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          onLeadChanged={handleChanged}
        />
      )}
    </div>
  );
}
