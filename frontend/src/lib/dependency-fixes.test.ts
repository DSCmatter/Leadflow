import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard test for the CVE remediation of the OpenTelemetry (frontend) and
 * psutil (backend) pins:
 *
 *   - @opentelemetry/exporter-prometheus 0.57.2 -> 0.217.0 (GHSA-q7rr-3cgh-j5r3)
 *   - @opentelemetry/propagator-jaeger    1.30.1 -> 2.9.0  (GHSA-45rx-2jwx-cxfr)
 *   - @opentelemetry/sdk-node             0.57.2 -> 0.217.0 (GHSA-q7rr-3cgh-j5r3)
 *   - psutil                              ==7.2.2 -> 5.6.6  (GHSA-qfc5-mcwq-26q8)
 *
 * It fails on the pre-fix tree (the lockfile still resolves the vulnerable
 * versions and requirements.txt pins psutil==7.2.2) and passes once the pins
 * are updated.
 */

function resolveFromRepo(...relative: string[]): string {
  const bases = [
    process.cwd(),
    path.join(process.cwd(), "frontend"),
    path.join(process.cwd(), "backend"),
    path.join(process.cwd(), ".."),
    path.join(process.cwd(), "..", "frontend"),
    path.join(process.cwd(), "..", "backend"),
  ];
  for (const base of bases) {
    const candidate = path.join(base, ...relative);
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Could not locate ${relative.join("/")} relative to ${process.cwd()}`);
}

const LOCK_PATH = resolveFromRepo("package-lock.json");
const REQUIREMENTS_PATH = resolveFromRepo("backend", "requirements.txt");

const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as {
  packages: Record<string, { version?: string }>;
};

describe("CVE dependency pins", () => {
  it("locks OpenTelemetry packages at the fixed versions", () => {
    const cases: Array<[string, string]> = [
      ["@opentelemetry/exporter-prometheus", "0.217.0"], // GHSA-q7rr-3cgh-j5r3
      ["@opentelemetry/propagator-jaeger", "2.9.0"], // GHSA-45rx-2jwx-cxfr
      ["@opentelemetry/sdk-node", "0.217.0"], // GHSA-q7rr-3cgh-j5r3
    ];
    for (const [packageName, fixed] of cases) {
      const version = lock.packages[`node_modules/${packageName}`]?.version;
      expect(version, `${packageName} present in lockfile`).toBeDefined();
      expect(
        version,
        `${packageName}@${version} must be ${fixed}`,
      ).toBe(fixed);
    }
  });

  it("pins psutil at the fixed version in backend requirements", () => {
    const requirements = readFileSync(REQUIREMENTS_PATH, "utf8");
    expect(requirements, "psutil pin present").toMatch(/^psutil==5\.6\.6$/m);
  });
});
