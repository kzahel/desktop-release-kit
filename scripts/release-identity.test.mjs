import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveIdentity,
  validatePackageVersion,
} from "./release-identity.mjs";
const input = {
  baseVersion: "0.2.0",
  ref: "refs/heads/main",
  event: "push",
  runNumber: 1,
  attempt: 1,
  sha: "a".repeat(40),
};
test("Latest ordering covers retries, newer runs and Stable catchup within every native package bound", () => {
  const first = resolveIdentity(input),
    retry = resolveIdentity({ ...input, attempt: 2 }),
    next = resolveIdentity({ ...input, runNumber: 2 });
  assert.deepEqual(
    [first.version, retry.version, next.version],
    ["0.3.101", "0.3.102", "0.3.201"],
  );
  for (const v of [first.version, retry.version, next.version, "0.4.0"])
    validatePackageVersion(v);
  assert.equal(first.tag, "desktop-latest-v0.3.101");
  assert.equal(
    resolveIdentity({ ...input, baseVersion: "0.4.0" }).version,
    "0.5.101",
  );
});
test("Stable is an exact deliberate tag and PR/dispatch never publish", () => {
  assert.equal(
    resolveIdentity({ ...input, ref: "refs/tags/desktop-v0.2.0" }).channel,
    "stable",
  );
  assert.throws(
    () => resolveIdentity({ ...input, ref: "refs/tags/desktop-v0.4.0" }),
    /match/,
  );
  for (const event of ["pull_request", "workflow_dispatch"])
    assert.equal(resolveIdentity({ ...input, event }).publish, false);
});
test("invalid, conflicting and overflowing identities fail before packaging", () => {
  for (const override of [
    { runNumber: 0 },
    { attempt: 0 },
    { attempt: 100 },
    { runNumber: 656 },
    { sha: "main" },
    { baseVersion: "0.255.0" },
  ])
    assert.throws(() => resolveIdentity({ ...input, ...override }));
  for (const v of [
    "0.2.0-latest.1",
    "256.0.0",
    "0.256.0",
    "0.0.65536",
    "01.0.0",
  ])
    assert.throws(() => validatePackageVersion(v));
});
