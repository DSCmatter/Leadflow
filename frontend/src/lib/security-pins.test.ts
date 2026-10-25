import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard test for the CVE remediation: the committed lockfile must resolve the
 * patched packages to versions at or above the fixed versions.
 *
 * It fails on the pre-fix tree (e.g. next@15.5.27, body-parser@2.3.0,
 * postcss@8.4.31, zod@3.25.76) and passes once the lockfile is updated.
 */

const LOCK_PATH = (() => {
  const candidates = [
    path.join(process.cwd(), "package-lock.json"),
    path.join(process.cwd(), "frontend", "package-lock.json"),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new Error("Could not locate frontend/package-lock.json");
})();

const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as {
  packages: Record<string, { version?: string }>;
};

function parseNumber(version: string): number[] {
  return version
    .replace(/^[v~^]/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

function gte(actual: string, minimum: string): boolean {
  const a = parseNumber(actual);
  const b = parseNumber(minimum);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
}

function resolvedVersions(packageName: string): string[] {
  const versions: string[] = [];
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (
      key === `node_modules/${packageName}` ||
      key.endsWith(`/node_modules/${packageName}`)
    ) {
      if (entry?.version) versions.push(entry.version);
    }
  }
  return versions;
}

describe("dependency security pins", () => {
  it("locks patched versions for CVE-affected dependencies", () => {
    const cases: Array<[string, string]> = [
      ["next", "15.5.28"], // GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r
      ["body-parser", "2.4.0"], // GHSA-27r3-jxmh-p828
      ["zod", "4.6.6"], // GHSA-mrhx-c7xc-m3w5
      ["undici", "8.12.2"], // GHSA-xjj6-f33q-929c (8.x line fix)
    ];
    for (const [packageName, minimum] of cases) {
      const version = lock.packages[`node_modules/${packageName}`]?.version;
      expect(version, `${packageName} present in lockfile`).toBeDefined();
      expect(
        gte(version as string, minimum),
        `${packageName}@${version} must be >= ${minimum}`,
      ).toBe(true);
    }

    // postcss is pinned exactly by next; every resolved instance must be past
    // the vulnerable 8.4.31 and cover both advisories (GHSA-6g55-p6wh-862q
    // fixed in 8.5.12, GHSA-r28c-9q8g-f849 fixed in 8.5.18).
    const postcssVersions = resolvedVersions("postcss");
    expect(postcssVersions.length).toBeGreaterThan(0);
    for (const version of postcssVersions) {
      expect(
        gte(version, "8.5.18"),
        `postcss@${version} must be >= 8.5.18`,
      ).toBe(true);
    }
  });
});
