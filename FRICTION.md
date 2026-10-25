# FRICTION: installing Autter Runtime (Next.js + FastAPI)

Scope: this repo (Next.js 15 App Router frontend, FastAPI backend, no auth, no LLM
calls, cross-origin `localhost:3000` → `localhost:8000`).

Docs read in full before writing code:

- https://autter.dev/docs/runtime/installation
- https://autter.dev/docs/runtime/integrations
- https://autter.dev/docs/runtime/without-npm
- https://autter.dev/docs/runtime/environment-variables

Items marked **verified** are things I confirmed by running code, not by reading.

---

## 1. "Three files" for Next.js, but zero snippets on the site

**Expected:** the Installation page says the Next.js setup is "three files" and then
shows those three files, as it does for other frameworks.

**Actual:** it names the files in prose and links to the GitHub package README. The
import paths, the `register()` shape, and the relay signature only exist on
`raw.githubusercontent.com`, outside the docs site. I had to fetch the README to
write anything.

**Workaround:** fetched `packages/runtime-next/README.md` and used its snippets
verbatim.

## 2. Two contradictory import paths for `registerAutter`

**Expected:** one canonical import, stated once.

**Actual:** the Installation page says `@autter/runtime-next/server`; the package
README's example imports from `@autter/runtime-next`. Both work, but no page says
they are interchangeable, and a reader cannot tell whether one is deprecated.

**Workaround:** used `/server` (more specific), as the docs site says.

## 3. Version pin does not match the documented features

**Expected:** the version the docs tell me to install supports the features the
same docs describe.

**Actual:** docs say `@autter/runtime-next@^1.4.0`. That resolves to 1.8.0 today, so
this happens to work, but several documented features (request summaries 1.5.0,
error stacks/source maps 1.6.0, filters 1.8.0) are gated at later versions than the
one printed in the install command. Nothing says "this pin resolves to current" or
"features below need X".

**Workaround:** installed `^1.4.0`; it resolved to 1.8.0. I did not add features
gated above the pin.

## 4. Errors are supposedly always sent, but the documented sampler drops 99% of them

**Expected:** the Integrations page says "Errors are always worth sending", so I
assumed the documented `parentbased_traceidratio 0.01` config still delivers every
error span.

**Actual:** with `opentelemetry-sdk` + the documented sampler, a span that is not
sampled is never exported, so 99 of 100 error spans are lost. The mechanism that
fixes this (`RecordUnsampled` + `RetainErrorTraces` in
`adapters/python/autter_tracing.py`) is not mentioned on any of the four pages, and
the "without npm" page explicitly says there is no Python-specific adapter.

**Verified (one half):** with `autter_tracing.py` a failing route exports `status=2`
plus an `exception` event and `autter.tail_retained=true` even at the 1% sampler. I
did not separately benchmark the plain-SDK case; that unsampled spans are dropped is
standard OTel behaviour, not something I measured here.

**Workaround:** copied `adapters/python/autter_tracing.py` and
`adapters/python/redact.py` into `backend/app/` and used `init_tracing(...)`. This is
the only reason backend errors reach the dashboard at all.

**Suggestion:** either link the adapter from the Python section or say plainly that
raw OTel needs the adapter to keep errors at 1% sampling.

## 5. Which HTTP metric does the ingester actually fold?

**Expected:** one instrument name.

**Actual:** Integrations and the runtime-next README say `http.server.duration`;
the "without npm" page says `http.server.request.duration`. I cannot tell which one
the request/usage rollups read.

**Workaround:** `autter_tracing.py` emits `http.server.duration` (delta, one point
per request, with `http.route`/`http.method`/`status`), so I trusted the adapter. I
did not verify which instrument the dashboard aggregates.

## 6. `deployment.environment` vs `deployment.environment.name`

**Expected:** the OTel-stable attribute name, since everything else in the config is
standard OTel.

**Actual:** the docs' env block uses `deployment.environment`. OTel stabilized this
as `deployment.environment.name`, and I could not find which one the ingester keys
on. I used the docs' form to stay literal, and suspect both are accepted.

## 7. `service.instance.id` is undocumented but load-bearing

**Expected:** the docs cover the resource attributes that matter for multiple
replicas.

**Actual:** no page mentions `service.instance.id`. Without it, several replicas
report under one identity. I only learned it mattered from a docstring inside
`autter_tracing.py`.

**Workaround:** generate a per-process UUID in `backend/app/observability.py`
(`AUTTER_RUNTIME_INSTANCE_ID` if set, else `uuid4()`).

## 8. Nothing says how to get the key into a local dev process

**Expected:** a sentence on where the key lives locally.

**Actual:** `.env.example` is documentation only: neither Next.js nor the Python app
loads it, and the pages never mention that. `npm run dev` without an exported
`AUTTER_RUNTIME_KEY` silently produces a relay that cannot authenticate, and the
Python app silently produces no telemetry.

**Workaround:** exported the variable in the shell for both processes; documented the
compose wiring in `docker-compose.yml`. The key is read at runtime, not build time,
for both the relay and `registerAutter`; the docs do not say that either.

## 9. Relay behaviour without a key is unspecified

**Expected:** the example in the README to run as written.

**Actual:** `createAutterRelayRoute({ apiKey: process.env.AUTTER_RUNTIME_KEY! })`
passes `undefined` at runtime when the var is missing; the `!` only silences the
compiler. No page says what the relay does then (500, 400, or 202-and-drop).

**Workaround:** passed `?? ''` and did not test the missing-key path.

## 10. Type errors in the documented snippets

**Expected:** copy-pasteable examples.

**Actual:** `apiKey: process.env.AUTTER_RUNTIME_KEY` is `string | undefined` and does
not satisfy `apiKey: string`, so `tsc --noEmit` fails on the README's own
`registerAutter` and `autterOnRequestError` examples. `onRequestError` also requires
an `edge.apiKey` even in an app that only ever runs the Node runtime.

**Workaround:** narrowed the key once (`const apiKey = process.env.AUTTER_RUNTIME_KEY`)
and skip `registerAutter` entirely when it is unset; `?? ""` for the edge block.
Errors are in `frontend/src/instrumentation.ts`.

## 11. `NEXT_PUBLIC_GIT_SHA` appears in the example, `VITE_GIT_SHA` in the docs

**Expected:** the release variable for a Next.js client to be documented.

**Actual:** the client snippet uses `process.env.NEXT_PUBLIC_GIT_SHA`, the
environment-variables page only documents `import.meta.env.VITE_GIT_SHA`. Nothing
says which value ends up as `release` for browser events or how to expose it in
Next.js (build-time inlining).

**Workaround:** kept `NEXT_PUBLIC_GIT_SHA`, which is inert unless the build sets it.

## 12. `retainTracesAboveMs` is recommended in one place and discouraged in another

**Expected:** one recommendation.

**Actual:** Installation presents `retainTracesAboveMs: 2000` as part of the setup;
environment-variables calls it opt-in and warns about export volume. I could not
tell whether leaving it off loses endpoint-regression data.

**Workaround:** passed `2000` as Installation recommends.

## 13. `opentelemetry-instrument` (distro) is the wrong entry point here, and the docs imply otherwise

**Expected:** since the request mentions `opentelemetry-distro`, I expected a
`opentelemetry-instrument uvicorn ...` setup.

**Actual:** the adapter explicitly refuses to replace an already-registered provider,
so under `opentelemetry-instrument` its always-on error path is inactive and errors
go back to being sampled out. Only in-process `init_tracing()` gets the behaviour the
docs promise. Nothing on the four pages says this.

**Workaround:** in-process init in `backend/app/observability.py`; no auto-instrument
CLI.

## 14. Browser action labels are required in practice but never documented

**Expected:** the browser section to mention `data-autter-action`.

**Actual:** not one of the four pages I read mentions it. Action capture is the whole point
of the breadcrumb/action feature.

**Workaround:** none yet; this repo's controls are unlabelled, so browser failures
carry no action name yet.

## 15. Small things

- The relay answers `400 {"error":"invalid json"}` for a malformed body. Reasonable,
  but the body contract (max size, required fields) is only described on the
  "without npm" page and never linked from the relay section.
- The relay's response body on success is empty; a 202 with no body is fine, only
  worth documenting because it looks like a failure in a terminal.
- `next dev` prints the thrown selftest stack to stderr, which makes it hard to tell
  whether the error was *also* reported to Autter. There is no documented way to see
  server-side submission status locally (no debug flag or log line).
- Package install scripts: npm 11 warned that two transitive postinstalls
  (`unrs-resolver`, `protobufjs`) are not covered by the allow-scripts policy. No
  install or build failure, but the docs do not mention the warning.

---

## What I did not verify

- Dashboard-side arrival of the errors. Both intentional errors were produced locally
  and the exporter accepted the payloads (`/v1/traces` and `/v1/metrics` returned
  200 for replayed real payloads), but "it appears in the Autter dashboard" is a
  check I cannot run from here.
- Browser source maps: not wired. The four docs pages do not cover the upload step,
  and there is no CI in this repo to hold an upload key.
