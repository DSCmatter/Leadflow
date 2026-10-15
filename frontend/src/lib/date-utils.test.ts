import { describe, expect, it } from "vitest";
import {
  followUpLabel,
  formatRelative,
  isOverdue,
  isPinnedFollowUp,
  isToday,
  toUtcIso,
} from "./date-utils";

// Fixed reference point: 2026-10-14 15:00 local time.
const REF = new Date(2026, 9, 14, 15, 0, 0);

function isoLocal(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

describe("formatRelative", () => {
  it("reports very recent timestamps as just now", () => {
    expect(formatRelative(REF.toISOString(), REF)).toBe("Just now");
  });
  it("formats hours, days, and weeks", () => {
    const twoHours = new Date(REF.getTime() - 2 * 3600_000).toISOString();
    expect(formatRelative(twoHours, REF)).toBe("2 hours ago");
    const threeDays = new Date(REF.getTime() - 3 * 86400_000).toISOString();
    expect(formatRelative(threeDays, REF)).toBe("3 days ago");
    const oneWeek = new Date(REF.getTime() - 7 * 86400_000).toISOString();
    expect(formatRelative(oneWeek, REF)).toBe("1 week ago");
  });
});

describe("follow-up classification", () => {
  it("treats later today as today but not overdue", () => {
    const later = isoLocal(2026, 10, 14, 18, 0);
    expect(isToday(later, REF)).toBe(true);
    expect(isOverdue(later, REF)).toBe(false);
    expect(isPinnedFollowUp(later, REF)).toBe(true);
  });
  it("treats earlier today as overdue but still pinned", () => {
    const earlier = isoLocal(2026, 10, 14, 9, 0);
    expect(isToday(earlier, REF)).toBe(true);
    expect(isOverdue(earlier, REF)).toBe(true);
    expect(isPinnedFollowUp(earlier, REF)).toBe(true);
  });
  it("treats tomorrow as neither today nor pinned", () => {
    const tomorrow = isoLocal(2026, 10, 15, 9, 0);
    expect(isToday(tomorrow, REF)).toBe(false);
    expect(isOverdue(tomorrow, REF)).toBe(false);
    expect(isPinnedFollowUp(tomorrow, REF)).toBe(false);
  });
  it("treats a previous date as overdue and pinned, never upcoming", () => {
    const yesterday = isoLocal(2026, 10, 13, 16, 0);
    expect(isOverdue(yesterday, REF)).toBe(true);
    expect(isPinnedFollowUp(yesterday, REF)).toBe(true);
  });
  it("handles a time close to midnight", () => {
    const justAfterMidnight = isoLocal(2026, 10, 14, 0, 1);
    const justBeforeMidnight = new Date(2026, 9, 13, 23, 59, 0);
    expect(isToday(justAfterMidnight, REF)).toBe(true);
    expect(isToday(justAfterMidnight, justBeforeMidnight)).toBe(false);
    expect(isPinnedFollowUp(justAfterMidnight, justBeforeMidnight)).toBe(false);
  });
  it("labels overdue follow-ups distinctly", () => {
    const yesterday = isoLocal(2026, 10, 13, 16, 0);
    expect(followUpLabel(yesterday, REF)).toMatch(/overdue/i);
    const later = isoLocal(2026, 10, 14, 18, 0);
    expect(followUpLabel(later, REF)).toMatch(/today at/i);
  });
});

describe("toUtcIso", () => {
  it("combines date and time inputs into a UTC ISO string", () => {
    const result = toUtcIso("2026-10-20", "14:30");
    expect(result).not.toBeNull();
    const parsed = new Date(result as string);
    expect(parsed.getFullYear()).toBe(2026);
    // Round-trips back to the same wall-clock time locally.
    expect(parsed.getHours()).toBe(14);
    expect(parsed.getMinutes()).toBe(30);
  });
  it("rejects incomplete or invalid inputs", () => {
    expect(toUtcIso("", "14:30")).toBeNull();
    expect(toUtcIso("2026-10-20", "")).toBeNull();
    expect(toUtcIso("2026-02-30", "10:00")).toBeNull();
    expect(toUtcIso("not-a-date", "10:00")).toBeNull();
    expect(toUtcIso("2026-10-20", "25:00")).toBeNull();
  });
});
