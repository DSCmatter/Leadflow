/**
 * Autter Runtime server instrumentation (Node runtime only).
 *
 * `registerAutter` starts the OpenTelemetry SDK used by route handlers, server
 * components and server actions. `onRequestError` reports the errors Next
 * catches itself (server components, route handlers, actions) with a stack.
 */
import { autterOnRequestError } from "@autter/runtime-next/instrumentation";

const SERVICE = "leadflow-web";

export async function register() {
  const apiKey = process.env.AUTTER_RUNTIME_KEY;
  if (process.env.NEXT_RUNTIME === "nodejs" && apiKey) {
    const { registerAutter } = await import("@autter/runtime-next/server");
    registerAutter({
      apiKey,
      service: SERVICE,
      environment: process.env.NODE_ENV,
      release: process.env.GIT_SHA,
      // Keep slow successful server traces for endpoint regression analysis.
      retainTracesAboveMs: 2000,
    });
  }
}

export const onRequestError = autterOnRequestError({
  // Edge runtime has no tracker running, so errors go straight out from here.
  edge: {
    apiKey: process.env.AUTTER_RUNTIME_KEY ?? "",
    service: SERVICE,
  },
});
