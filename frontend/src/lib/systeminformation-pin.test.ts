import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard test for the CVE remediation of the systeminformation pin
 * (GHSA-3f7j-7jwc-fxfj / CVE-2026-116576): the committed lockfile must
 * resolve systeminformation to the patched version 5.33.16 or newer.
 *
 * It fails on the pre-fix tree (the lockfile resolves systeminformation@
 * 5.33.15, which is vulnerable to Windows command injection in services()
 * through Unicode quotation marks) and passes once the lockfile is updated.
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

describe("systeminformation security pin", () => {
  it("locks systeminformation at the patched version", () => {
    const version = lock.packages["node_modules/systeminformation"]?.version;
    expect(version, "systeminformation present in lockfile").toBeDefined();
    expect(
      gte(version as string, "5.33.16"),
      `systeminformation@${version} must be >= 5.33.16 (GHSA-3f7j-7jwc-fxfj)`,
    ).toBe(true);
  });
});
