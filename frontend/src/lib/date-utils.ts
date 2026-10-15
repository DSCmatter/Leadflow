/** Centralized timestamp handling for LeadFlow.
 *
 * The API stores timestamps as UTC ISO 8601 strings. All display and
 * calendar-day classification happens here, in the browser's local timezone.
 */

export function now(): Date {
  return new Date();
}

/** "May 4, 10:30 AM" in the browser's local timezone. */
export function formatAbsolute(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const timePart = date
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(/\s+/g, " ");
  return `${datePart}, ${timePart}`;
}

/** "Just now" / "2 hours ago" / "3 days ago" / "1 week ago". */
export function formatRelative(iso: string, reference: Date = now()): string {
  const then = new Date(iso).getTime();
  const diffMs = reference.getTime() - then;
  if (diffMs < 0) return "Just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True when the timestamp is strictly in the past. */
export function isOverdue(iso: string, reference: Date = now()): boolean {
  return new Date(iso).getTime() < reference.getTime();
}

/** True when the timestamp falls on the browser's current local calendar day. */
export function isToday(iso: string, reference: Date = now()): boolean {
  const target = new Date(iso);
  return startOfLocalDay(target).getTime() === startOfLocalDay(reference).getTime();
}

/**
 * Whether a follow-up belongs in the pinned "Today's follow-ups" section:
 * scheduled for today, or overdue from a previous date. Future dates
 * (tomorrow and beyond) are excluded.
 */
export function isPinnedFollowUp(iso: string, reference: Date = now()): boolean {
  const target = startOfLocalDay(new Date(iso)).getTime();
  const today = startOfLocalDay(reference).getTime();
  return target <= today;
}

/** "2:00 PM" in the browser's local timezone. */
export function formatLocalTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\s+/g, " ");
}

/** Short label for the follow-up chip on lead cards. */
export function followUpLabel(iso: string, reference: Date = now()): string {
  if (isOverdue(iso, reference) && !isToday(iso, reference)) {
    return `Overdue since ${formatAbsolute(iso)}`;
  }
  if (isToday(iso, reference)) {
    return isOverdue(iso, reference)
      ? `Follow-up today at ${formatLocalTime(iso)} (overdue)`
      : `Follow-up today at ${formatLocalTime(iso)}`;
  }
  return `Follow-up set for: ${formatAbsolute(iso)}`;
}

/**
 * Combine separate `yyyy-mm-dd` and `hh:mm` inputs (interpreted in the
 * browser's local timezone) into a UTC ISO 8601 string for the API.
 * Returns null when either part is missing or invalid.
 */
export function toUtcIso(datePart: string, timePart: string): string | null {
  if (!datePart || !timePart) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timePart);
  if (!dateMatch || !timeMatch) return null;
  const [, y, mo, d] = dateMatch.map(Number);
  const [, h, mi] = timeMatch.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const local = new Date(y, mo - 1, d, h, mi, 0, 0);
  // Guard against impossible dates such as Feb 30 (JS rolls over).
  if (
    local.getFullYear() !== y ||
    local.getMonth() !== mo - 1 ||
    local.getDate() !== d
  ) {
    return null;
  }
  return local.toISOString();
}
