/**
 * Same-origin relay for browser telemetry.
 *
 * The browser tracker posts to this route; it attaches the server ingest key
 * and forwards to Autter. The key never reaches the browser bundle.
 */
import { createAutterRelayRoute } from "@autter/runtime-next";

export const { POST } = createAutterRelayRoute({
  apiKey: process.env.AUTTER_RUNTIME_KEY ?? "",
});
