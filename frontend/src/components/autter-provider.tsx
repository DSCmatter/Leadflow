"use client";

/**
 * Browser-side Autter Runtime setup.
 *
 * Initialised at module scope so it runs once per page load, before any
 * component renders. Errors go through the same-origin relay route, so no
 * ingest key is exposed to the browser.
 */
import {
  AutterErrorBoundary,
  initAutterBrowser,
} from "@autter/runtime-next/client";

initAutterBrowser({
  endpoint: "/api/autter-runtime",
  service: "leadflow-web",
  release: process.env.NEXT_PUBLIC_GIT_SHA,
});

export function AutterProvider({ children }: { children: React.ReactNode }) {
  return (
    <AutterErrorBoundary
      fallback={
        <p className="p-6 text-sm">
          Something went wrong. Reload the page to keep working.
        </p>
      }
    >
      {children}
    </AutterErrorBoundary>
  );
}
