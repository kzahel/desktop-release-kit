#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const manifest = path.join(root, "src-tauri", "sidecar", "Cargo.toml");
const target =
  process.env.TARGET_TRIPLE ||
  execFileSync("rustc", ["--print", "host-tuple"], { encoding: "utf8" }).trim();
const buildId =
  process.env.CANARY_BUILD_ID ||
  process.env.GITHUB_SHA?.slice(0, 12) ||
  (() => {
    try {
      return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return "uncommitted";
    }
  })();

const arguments_ = [
  "build",
  "--release",
  "--manifest-path",
  manifest,
  "--bin",
  "canary-sidecar",
];
if (process.env.TARGET_TRIPLE) arguments_.push("--target", target);

execFileSync("cargo", arguments_, {
  cwd: root,
  env: { ...process.env, CANARY_BUILD_ID: buildId },
  stdio: "inherit",
});

const windows = target.includes("windows");
const suffix = windows ? ".exe" : "";
const targetDirectory = process.env.TARGET_TRIPLE
  ? path.join(root, "src-tauri", "sidecar", "target", target, "release")
  : path.join(root, "src-tauri", "sidecar", "target", "release");
const source = path.join(targetDirectory, `canary-sidecar${suffix}`);
const destinationDirectory = path.join(root, "src-tauri", "binaries");
const destination = path.join(
  destinationDirectory,
  `canary-sidecar-${target}${suffix}`,
);

fs.mkdirSync(destinationDirectory, { recursive: true });
fs.copyFileSync(source, destination);
if (!windows) fs.chmodSync(destination, 0o755);
console.log(`Prepared ${path.relative(root, destination)} (${buildId})`);
