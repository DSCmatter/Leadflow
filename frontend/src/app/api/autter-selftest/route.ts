/**
 * Temporary Autter Runtime selftest route.
 *
 * Deliberately throws so the error shows up in the Autter dashboard
 * (server-side, via `onRequestError`). Remove before shipping, or keep it
 * gated behind a non-production check.
 */
export async function GET() {
  throw new Error("Autter Runtime selftest error (frontend route handler)");
}
