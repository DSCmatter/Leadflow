import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddLeadDialog } from "./add-lead-dialog";
import type { Lead } from "@/types/lead";

const { mockCreateLead } = vi.hoisted(() => ({ mockCreateLead: vi.fn() }));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { api: { createLead: mockCreateLead }, ApiError };
});

const CREATED: Lead = {
  id: 7,
  name: "John Doe",
  company: "Stark Industries",
  phone: "555-0123",
  status: "New",
  follow_up_at: null,
  created_at: "2026-10-14T10:00:00+00:00",
  updated_at: "2026-10-14T10:00:00+00:00",
  latest_note: null,
  latest_discussion_at: null,
};

describe("AddLeadDialog", () => {
  beforeEach(() => {
    mockCreateLead.mockReset();
  });

  it("rejects an empty name without calling the API", async () => {
    const user = userEvent.setup();
    render(<AddLeadDialog onClose={() => {}} onCreated={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Save Lead" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/full name is required/i);
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it("creates a lead and closes on success", async () => {
    const user = userEvent.setup();
    mockCreateLead.mockResolvedValue(CREATED);
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<AddLeadDialog onClose={onClose} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.type(screen.getByLabelText(/company/i), "Stark Industries");
    await user.click(screen.getByRole("button", { name: "Save Lead" }));
    await waitFor(() => expect(mockCreateLead).toHaveBeenCalledTimes(1));
    expect(mockCreateLead).toHaveBeenCalledWith({
      name: "John Doe",
      company: "Stark Industries",
      phone: undefined,
    });
    expect(onCreated).toHaveBeenCalledWith(CREATED);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the API error and preserves entered values", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api");
    mockCreateLead.mockRejectedValue(new ApiError(500, "Database is down."));
    render(<AddLeadDialog onClose={() => {}} onCreated={() => {}} />);
    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.click(screen.getByRole("button", { name: "Save Lead" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/database is down/i),
    );
    expect(screen.getByLabelText(/full name/i)).toHaveValue("John Doe");
  });

  it("prevents duplicate submissions while saving", async () => {
    const user = userEvent.setup();
    let resolve!: (value: Lead) => void;
    mockCreateLead.mockReturnValue(new Promise<Lead>((r) => (resolve = r)));
    render(<AddLeadDialog onClose={() => {}} onCreated={() => {}} />);
    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.click(screen.getByRole("button", { name: "Save Lead" }));
    await user.click(screen.getByRole("button", { name: /saving/i }));
    expect(mockCreateLead).toHaveBeenCalledTimes(1);
    resolve(CREATED);
  });
});
