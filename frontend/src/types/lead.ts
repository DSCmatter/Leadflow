export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type StatusFilter = "All" | LeadStatus;

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  latest_note: string | null;
  latest_discussion_at: string | null;
}

export interface LeadCreateInput {
  name: string;
  company?: string;
  phone?: string;
}

export interface LeadUpdateInput {
  status?: LeadStatus;
  name?: string;
  company?: string;
  phone?: string;
}
