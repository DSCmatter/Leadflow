import type { LeadStatus } from "@/types/lead";
import { Badge } from "@/components/ui/badge";

const DOTS: Record<LeadStatus, string> = {
  New: "bg-emerald-600",
  Contacted: "bg-amber-500",
  Qualified: "bg-sky-600",
  "Proposal Sent": "bg-violet-600",
  Won: "bg-ink",
  Lost: "bg-red-600",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 rounded-full border-ink/20 bg-cream px-2.5 py-0.5 text-[11px] font-bold tracking-[0.08em] text-ink uppercase"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${DOTS[status]}`}
      />
      {status}
    </Badge>
  );
}
