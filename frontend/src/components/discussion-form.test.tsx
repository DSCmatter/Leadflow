import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiscussionForm } from "./discussion-form";

describe("DiscussionForm", () => {
  it("rejects an empty note", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<DiscussionForm onSave={onSave} saving={false} />);
    await user.click(screen.getByRole("button", { name: "Save Note" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a discussion note/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("requires a complete follow-up date and time when scheduling", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(null);
    render(<DiscussionForm onSave={onSave} saving={false} />);
    await user.type(screen.getByLabelText(/log a new discussion/i), "Called back.");
    await user.click(screen.getByLabelText(/set follow-up/i));
    await user.click(screen.getByRole("button", { name: "Save Note" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /valid follow-up date and time/i,
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a note without a follow-up and clears the field", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(null);
    render(<DiscussionForm onSave={onSave} saving={false} />);
    await user.type(screen.getByLabelText(/log a new discussion/i), "Called back.");
    await user.click(screen.getByRole("button", { name: "Save Note" }));
    expect(onSave).toHaveBeenCalledWith({ note: "Called back.", followUpAt: null });
    expect(screen.getByLabelText(/log a new discussion/i)).toHaveValue("");
  });

  it("keeps the note when the save fails", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue("Server exploded.");
    render(<DiscussionForm onSave={onSave} saving={false} />);
    await user.type(screen.getByLabelText(/log a new discussion/i), "Called back.");
    await user.click(screen.getByRole("button", { name: "Save Note" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/server exploded/i);
    expect(screen.getByLabelText(/log a new discussion/i)).toHaveValue("Called back.");
  });
});
