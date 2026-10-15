export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  follow_up_at: string | null;
  created_at: string;
}

export interface LeadDetail {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: import("./lead").LeadStatus;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  discussions: Discussion[];
}

export interface DiscussionCreateInput {
  note: string;
  follow_up_at?: string | null;
}
