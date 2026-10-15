/** Typed HTTP client — the only module that talks to the FastAPI backend. */

import type {
  Lead,
  LeadCreateInput,
  LeadUpdateInput,
} from "@/types/lead";
import type {
  Discussion,
  DiscussionCreateInput,
  LeadDetail,
} from "@/types/discussion";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload !== null && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((entry) =>
          entry !== null && typeof entry === "object" && "msg" in entry
            ? String((entry as { msg: unknown }).msg)
            : null,
        )
        .filter((m): m is string => m !== null);
      if (messages.length > 0) return messages.join(" ");
    }
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Please try again.");
  }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      message = extractMessage(await response.json(), message);
    } catch {
      /* keep fallback */
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listLeads(): Promise<Lead[]> {
    return request<Lead[]>("/api/v1/leads");
  },
  createLead(input: LeadCreateInput): Promise<Lead> {
    return request<Lead>("/api/v1/leads", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  getLead(id: number): Promise<LeadDetail> {
    return request<LeadDetail>(`/api/v1/leads/${id}`);
  },
  updateLead(id: number, input: LeadUpdateInput): Promise<Lead> {
    return request<Lead>(`/api/v1/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  createDiscussion(id: number, input: DiscussionCreateInput): Promise<Discussion> {
    return request<Discussion>(`/api/v1/leads/${id}/discussions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  cancelFollowUp(id: number): Promise<Lead> {
    return request<Lead>(`/api/v1/leads/${id}/follow-up`, { method: "DELETE" });
  },
};
