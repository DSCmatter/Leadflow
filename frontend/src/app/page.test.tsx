import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";
import type { Lead } from "@/types/lead";

const { mockListLeads } = vi.hoisted(() => ({ mockListLeads: vi.fn() }));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    api: {
      listLeads: mockListLeads,
      createLead: vi.fn(),
      getLead: vi.fn(),
      updateLead: vi.fn(),
      createDiscussion: vi.fn(),
      cancelFollowUp: vi.fn(),
    },
    ApiError,
  };
});

function lead(overrides: Partial<Lead> & { id: number; name: string }): Lead {
  return {
    company: null,
    phone: null,
    status: "New",
    follow_up_at: null,
    created_at: "2026-10-14T10:00:00+00:00",
    updated_at: "2026-10-14T10:00:00+00:00",
    latest_note: null,
    latest_discussion_at: null,
    ...overrides,
  };
}

// Follow-ups relative to the real clock: local noon today (always "today"),
// noon yesterday (always overdue), noon tomorrow (never pinned).
function atNoon(offsetDays: number): string {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offsetDays,
    12,
    0,
    0,
  ).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

function leadsFixture(): Lead[] {
  return [
    lead({
      id: 1,
      name: "Sarah Connor",
      company: "Acme Corp",
      status: "Proposal Sent",
      follow_up_at: atNoon(0),
      latest_note: "Sent pricing tier PDF.",
      latest_discussion_at: daysAgo(2),
    }),
    lead({
      id: 2,
      name: "Tony Stark",
      company: "Stark Industries",
      status: "Contacted",
      follow_up_at: atNoon(-1),
      latest_note: "Asked for a callback.",
      latest_discussion_at: daysAgo(4),
    }),
    lead({
      id: 3,
      name: "Hank Scorpio",
      company: "Globex",
      status: "New",
      latest_note: "Inbound lead from website contact form.",
      latest_discussion_at: daysAgo(0.08),
    }),
    lead({
      id: 4,
      name: "Pepper Potts",
      company: "Stark Industries",
      status: "Qualified",
      follow_up_at: atNoon(1),
    }),
  ];
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockListLeads.mockReset();
    mockListLeads.mockResolvedValue(leadsFixture());
  });

  async function renderDashboard() {
    render(<DashboardPage />);
    await screen.findByText("Hank Scorpio");
  }

  it("pins today and overdue follow-ups and excludes them from the list", async () => {
    await renderDashboard();
    const pinned = screen.getByLabelText("Today's follow-ups");
    expect(within(pinned).getByText("Sarah Connor")).toBeInTheDocument();
    expect(within(pinned).getByText("Tony Stark")).toBeInTheDocument();
    // Tomorrow's follow-up is not pinned.
    expect(within(pinned).queryByText("Pepper Potts")).not.toBeInTheDocument();
    // Pinned leads appear exactly once on the page.
    expect(screen.getAllByText("Sarah Connor")).toHaveLength(1);
    expect(screen.getAllByText("Tony Stark")).toHaveLength(1);
    // Regular list keeps the rest.
    const allLeads = screen.getByLabelText("All leads");
    expect(within(allLeads).getByText("Hank Scorpio")).toBeInTheDocument();
    expect(within(allLeads).getByText("Pepper Potts")).toBeInTheDocument();
  });

  it("distinguishes overdue reminders visually", async () => {
    await renderDashboard();
    const pinned = screen.getByLabelText("Today's follow-ups");
    const overdueChips = within(pinned).getAllByText(/overdue/i);
    expect(overdueChips.length).toBeGreaterThanOrEqual(1);
    for (const chip of overdueChips) {
      expect(chip.className).toMatch(/red/);
    }
  });

  it("searches case-insensitively and combines with the status filter", async () => {
    await renderDashboard();
    fireEvent.change(screen.getByLabelText(/search leads by name/i), {
      target: { value: "sarah" },
    });
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.queryByText("Hank Scorpio")).not.toBeInTheDocument();
    // Combine with a non-matching status: nothing matches.
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(screen.queryByText("Sarah Connor")).not.toBeInTheDocument();
    expect(screen.getByText(/no leads match/i)).toBeInTheDocument();
    // Clearing restores everything.
    fireEvent.click(screen.getByText(/clear search and filters/i));
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("Hank Scorpio")).toBeInTheDocument();
  });

  it("shows an understandable error when loading fails", async () => {
    const { ApiError } = await import("@/lib/api");
    mockListLeads.mockRejectedValue(new ApiError(0, "Could not reach the server."));
    render(<DashboardPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not reach the server/i,
    );
  });
});
