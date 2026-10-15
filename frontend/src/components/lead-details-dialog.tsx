"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ApiError, api } from "@/lib/api";
import { formatAbsolute } from "@/lib/date-utils";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/types/lead";
import type { Discussion, LeadDetail } from "@/types/discussion";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiscussionForm, type DiscussionFormValue } from "./discussion-form";
import { DiscussionTimeline } from "./discussion-timeline";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function LeadDetailsDialog({
  leadId,
  onClose,
  onLeadChanged,
}: {
  leadId: number;
  onClose: () => void;
  /** Notify the dashboard so badges, previews, and follow-up sections refresh. */
  onLeadChanged: (lead: Lead) => void;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api
      .getLead(leadId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(errorMessage(err, "Could not load this lead."));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function handleStatusChange(next: LeadStatus) {
    if (!detail || statusSaving || next === detail.status) return;
    setStatusSaving(true);
    setActionError(null);
    try {
      const updated = await api.updateLead(leadId, { status: next });
      setDetail({ ...detail, status: next, updated_at: updated.updated_at });
      onLeadChanged(updated);
    } catch (err) {
      setActionError(errorMessage(err, "Could not update the status."));
    } finally {
      setStatusSaving(false);
    }
  }

  const handleSaveNote = useCallback(
    async (value: DiscussionFormValue): Promise<string | null> => {
      setNoteSaving(true);
      setActionError(null);
      try {
        const created: Discussion = await api.createDiscussion(leadId, {
          note: value.note,
          follow_up_at: value.followUpAt,
        });
        // Refresh the full lead so follow_up_at, preview, and ordering
        // come from the server — no page reload needed.
        const refreshed = await api.getLead(leadId);
        setDetail(refreshed);
        onLeadChanged({
          id: refreshed.id,
          name: refreshed.name,
          company: refreshed.company,
          phone: refreshed.phone,
          status: refreshed.status,
          follow_up_at: refreshed.follow_up_at,
          created_at: refreshed.created_at,
          updated_at: refreshed.updated_at,
          latest_note: created.note,
          latest_discussion_at: created.created_at,
        });
        return null;
      } catch (err) {
        return errorMessage(err, "Could not save the discussion.");
      } finally {
        setNoteSaving(false);
      }
    },
    [leadId, onLeadChanged],
  );

  async function handleCancelFollowUp() {
    if (!detail || cancelling) return;
    setCancelling(true);
    setActionError(null);
    try {
      const updated = await api.cancelFollowUp(leadId);
      setDetail({ ...detail, follow_up_at: null, updated_at: updated.updated_at });
      onLeadChanged(updated);
    } catch (err) {
      setActionError(errorMessage(err, "Could not cancel the follow-up."));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-ink/60 backdrop-blur-[2px]" />
        <DialogPrimitive.Popup
          role="dialog"
          aria-modal="true"
          aria-label={detail ? `Details for ${detail.name}` : "Lead details"}
          className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100%-2rem)] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-0 overflow-y-auto rounded-lg border border-ink bg-cream text-ink shadow-[6px_6px_0_rgba(28,24,19,0.85)] outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          {loading && <p className="px-6 py-10 text-center font-display text-lg text-ink/50 italic">Loading lead…</p>}
          {loadError && (
            <div className="px-6 py-10 text-center">
              <p role="alert" className="text-sm font-medium text-red-700">
                {loadError}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-4 border-ink"
              >
                Close
              </Button>
            </div>
          )}
          {detail && (
            <>
              <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-6 py-4">
                <div className="min-w-0">
                  <DialogTitle className="font-display text-[26px] leading-tight tracking-tight text-ink">
                    {detail.name}{" "}
                    {detail.company && (
                      <span className="font-sans text-base font-normal text-ink/50">({detail.company})</span>
                    )}
                  </DialogTitle>
                  {detail.phone && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/70">
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {detail.phone}
                    </p>
                  )}
                  {detail.follow_up_at && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-2 py-0.5 text-xs font-bold text-volt">
                      Follow-up: {formatAbsolute(detail.follow_up_at)}{" "}
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleCancelFollowUp}
                        disabled={cancelling}
                        className="h-auto px-0 text-xs font-bold text-volt/80 underline hover:text-volt"
                      >
                        {cancelling ? "Cancelling…" : "Cancel follow-up"}
                      </Button>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="sr-only" htmlFor="lead-status">
                    Lead status
                  </label>
                  <select
                    id="lead-status"
                    value={detail.status}
                    disabled={statusSaving}
                    onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                    className="rounded-md border border-ink/25 bg-white px-2 py-1.5 text-sm font-medium text-ink focus:border-ink focus:ring-1 focus:ring-ink disabled:opacity-60"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="rounded-md border border-transparent p-1 text-ink/50 transition hover:border-ink hover:bg-volt hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto bg-paper px-6 py-5">
                <DiscussionTimeline discussions={detail.discussions} />
              </div>
              <div className="border-t border-ink/15 bg-cream px-6 py-4">
                {actionError && (
                  <p role="alert" className="mb-2 border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm font-medium text-red-700">
                    {actionError}
                  </p>
                )}
                <DiscussionForm onSave={handleSaveNote} saving={noteSaving} />
              </div>
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
