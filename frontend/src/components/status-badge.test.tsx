import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";
import { LEAD_STATUSES } from "@/types/lead";

describe("StatusBadge", () => {
  for (const status of LEAD_STATUSES) {
    it(`renders the ${status} badge`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    });
  }
});
