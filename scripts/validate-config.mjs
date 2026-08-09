#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EXPECTED_ENDPOINT =
  "https://updates.graehlarts.com/canary/tauri/{{target}}/{{arch}}/{{current_version}}";

function fail(message) {
  throw new Error(message);
}

function cargoVersion(contents) {
  const packageSection = contents.match(/\[package\]([\s\S]*?)(?:\n\[|$)/)?.[1];
  const version = packageSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (!version) fail("src-tauri/Cargo.toml has no package version");
  return version;
}

export function validateConfiguration({
  packageJson,
  tauri,
  cargo,
  sidecarCargo,
  product,
}) {
  const versions = {
    package: packageJson.version,
    tauri: tauri.version,
    cargo: cargoVersion(cargo),
    sidecar: cargoVersion(sidecarCargo),
  };
  const distinctVersions = new Set(Object.values(versions));
  if (distinctVersions.size !== 1) {
    fail(`version drift: ${JSON.stringify(versions)}`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(tauri.version)) {
    fail(`version is not stable semver: ${tauri.version}`);
  }
  if (tauri.identifier !== "com.kzahel.desktop-release-canary") {
    fail(`unexpected Tauri identifier: ${tauri.identifier}`);
  }
  if (tauri.bundle?.createUpdaterArtifacts !== true) {
    fail("Tauri updater artifacts must be enabled");
  }
  const endpoints = tauri.plugins?.updater?.endpoints;
  if (!Array.isArray(endpoints) || endpoints.length !== 1 || endpoints[0] !== EXPECTED_ENDPOINT) {
    fail(`unexpected updater endpoints: ${JSON.stringify(endpoints)}`);
  }
  const pubkey = tauri.plugins?.updater?.pubkey;
  if (!pubkey || pubkey === "__TAURI_UPDATER_PUBLIC_KEY__") {
    fail("replace the updater public-key placeholder");
  }
  let decoded;
  try {
    decoded = Buffer.from(pubkey, "base64").toString("utf8");
  } catch {
    fail("updater public key is not base64");
  }
  if (!decoded.startsWith("untrusted comment: minisign public key") || !decoded.includes("\nRW")) {
    fail("updater public key does not encode a minisign public-key file");
  }

  const expectedProduct = {
    id: "desktop-release-canary",
    displayName: "Desktop Release Canary",
    hostnames: ["updates.graehlarts.com"],
    pathPrefix: "/canary",
    githubRepo: "kzahel/desktop-release-kit",
    tagPrefix: "desktop-v",
    tauriUpdates: true,
  };
  if (JSON.stringify(product) !== JSON.stringify(expectedProduct)) {
    fail(`unexpected update-server product config: ${JSON.stringify(product)}`);
  }

  return { version: tauri.version, endpoint: EXPECTED_ENDPOINT };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function validateRepository(root) {
  const result = validateConfiguration({
    packageJson: readJson(path.join(root, "package.json")),
    tauri: readJson(path.join(root, "src-tauri", "tauri.conf.json")),
    cargo: fs.readFileSync(path.join(root, "src-tauri", "Cargo.toml"), "utf8"),
    sidecarCargo: fs.readFileSync(
      path.join(root, "src-tauri", "sidecar", "Cargo.toml"),
      "utf8",
    ),
    product: readJson(path.join(root, "update-server", "desktop-canary.json")),
  });
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  if (!changelog.includes(`## [${result.version}]`)) {
    fail(`CHANGELOG.md has no ${result.version} entry`);
  }
  return result;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const root = path.resolve(import.meta.dirname, "..");
    const result = validateRepository(root);
    console.log(`Validated desktop release configuration ${result.version}`);
  } catch (error) {
    console.error(`Configuration validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
