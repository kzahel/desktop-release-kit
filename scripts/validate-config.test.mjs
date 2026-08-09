import assert from "node:assert/strict";
import test from "node:test";
import { validateConfiguration } from "./validate-config.mjs";

const publicKey = Buffer.from(
  "untrusted comment: minisign public key 0123456789ABCDEF\nRWQexample\n",
).toString("base64");

function fixture() {
  return {
    packageJson: { version: "1.2.3" },
    cargo: '[package]\nname = "desktop-release-canary"\nversion = "1.2.3"\n\n[dependencies]\n',
    sidecarCargo: '[package]\nname = "canary-sidecar"\nversion = "1.2.3"\n\n[dependencies]\n',
    tauri: {
      version: "1.2.3",
      identifier: "com.kzahel.desktop-release-canary",
      bundle: { createUpdaterArtifacts: true },
      plugins: {
        updater: {
          endpoints: [
            "https://updates.graehlarts.com/canary/tauri/{{target}}/{{arch}}/{{current_version}}",
          ],
          pubkey: publicKey,
        },
      },
    },
    product: {
      id: "desktop-release-canary",
      displayName: "Desktop Release Canary",
      hostnames: ["updates.graehlarts.com"],
      pathPrefix: "/canary",
      githubRepo: "kzahel/desktop-release-kit",
      tagPrefix: "desktop-v",
      tauriUpdates: true,
    },
  };
}

test("accepts one exact product and version contract", () => {
  assert.equal(validateConfiguration(fixture()).version, "1.2.3");
});

test("rejects version drift", () => {
  const data = fixture();
  data.tauri.version = "1.2.4";
  assert.throws(() => validateConfiguration(data), /version drift/);
});

test("rejects an unresolved updater key", () => {
  const data = fixture();
  data.tauri.plugins.updater.pubkey = "__TAURI_UPDATER_PUBLIC_KEY__";
  assert.throws(() => validateConfiguration(data), /public-key placeholder/);
});

test("rejects server/client route drift", () => {
  const data = fixture();
  data.product.pathPrefix = "/different";
  assert.throws(() => validateConfiguration(data), /product config/);
});
