import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Discussion } from "@/types/discussion";
import { DiscussionTimeline } from "./discussion-timeline";

function discussion(id: number, note: string, createdAt: string): Discussion {
  return { id, lead_id: 1, note, follow_up_at: null, created_at: createdAt };
}

describe("DiscussionTimeline", () => {
  it("renders newest first and shows follow-up info", () => {
    render(
      <DiscussionTimeline
        discussions={[
          discussion(3, "Newest note", "2026-05-04T10:30:00+00:00"),
          discussion(2, "Middle note", "2026-05-01T09:00:00+00:00"),
          discussion(1, "Oldest note", "2026-04-30T16:00:00+00:00"),
        ]}
      />,
    );
    const notes = screen.getAllByText(/note$/).map((el) => el.textContent);
    expect(notes).toEqual(["Newest note", "Middle note", "Oldest note"]);
  });

  it("shows an empty state with no discussions", () => {
    render(<DiscussionTimeline discussions={[]} />);
    expect(screen.getByText(/no discussions yet/i)).toBeInTheDocument();
  });

  it("displays the follow-up chip for discussions that set one", () => {
    render(
      <DiscussionTimeline
        discussions={[
          {
            ...discussion(1, "With reminder", "2026-05-04T10:30:00+00:00"),
            follow_up_at: "2026-05-06T14:00:00+00:00",
          },
        ]}
      />,
    );
    expect(screen.getByText(/follow-up set for/i)).toBeInTheDocument();
  });
});
