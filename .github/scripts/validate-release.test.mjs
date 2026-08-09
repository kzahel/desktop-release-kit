import assert from "node:assert/strict";
import test from "node:test";
import { validateRelease } from "./validate-release.mjs";

const tag = "desktop-v1.2.3";
const repository = "kzahel/desktop-release-kit";
const version = "1.2.3";
const digest = `sha256:${"a".repeat(64)}`;

function fixture() {
  const updaterAssets = {
    "darwin-aarch64": "Desktop.Release.Canary_aarch64.app.tar.gz",
    "darwin-x86_64": "Desktop.Release.Canary_x64.app.tar.gz",
    "linux-aarch64": `desktop-release-canary_${version}_aarch64.AppImage`,
    "linux-x86_64": `desktop-release-canary_${version}_amd64.AppImage`,
    "windows-x86_64": `Desktop.Release.Canary_${version}_x64-setup.exe`,
  };
  const names = new Set([
    `Desktop.Release.Canary_${version}_aarch64.dmg`,
    `Desktop.Release.Canary_${version}_x64.dmg`,
    `Desktop.Release.Canary_${version}_x64-setup.exe`,
    `Desktop.Release.Canary_${version}_x64_en-US.msi`,
    `desktop-release-canary_${version}_amd64.AppImage`,
    `desktop-release-canary_${version}_amd64.deb`,
    `desktop-release-canary-${version}-1.x86_64.rpm`,
    `desktop-release-canary_${version}_aarch64.AppImage`,
    `desktop-release-canary_${version}_arm64.deb`,
    `desktop-release-canary-${version}-1.aarch64.rpm`,
    "latest.json",
  ]);
  for (const name of Object.values(updaterAssets)) {
    names.add(name);
    names.add(`${name}.sig`);
  }
  return {
    release: {
      tagName: tag,
      isDraft: true,
      assets: [...names].map((name) => ({ name, digest })),
    },
    latest: {
      version,
      platforms: Object.fromEntries(
        Object.entries(updaterAssets).map(([platform, name]) => [
          platform,
          {
            signature: "signed-updater-metadata-that-is-long-enough",
            url: `https://github.com/${repository}/releases/download/${tag}/${name}`,
          },
        ]),
      ),
    },
  };
}

test("accepts a complete five-target draft", () => {
  assert.equal(validateRelease({ ...fixture(), tag, repository }).version, version);
});

test("rejects an already-public release", () => {
  const data = fixture();
  data.release.isDraft = false;
  assert.throws(() => validateRelease({ ...data, tag, repository }), /remain a draft/);
});

test("rejects missing platform coverage", () => {
  const data = fixture();
  delete data.latest.platforms["linux-aarch64"];
  assert.throws(() => validateRelease({ ...data, tag, repository }), /missing platform linux-aarch64/);
});

test("rejects updater URLs outside the tagged release", () => {
  const data = fixture();
  data.latest.platforms["windows-x86_64"].url = "https://example.test/canary.exe";
  assert.throws(() => validateRelease({ ...data, tag, repository }), /unexpected URL/);
});

test("rejects a package-manager artifact as the Linux updater", () => {
  const data = fixture();
  data.latest.platforms["linux-x86_64"].url =
    `https://github.com/${repository}/releases/download/${tag}/desktop-release-canary_${version}_amd64.deb`;
  data.release.assets.push({
    name: `desktop-release-canary_${version}_amd64.deb.sig`,
    digest,
  });
  assert.throws(() => validateRelease({ ...data, tag, repository }), /must use \.AppImage/);
});

test("rejects a release without GitHub asset digests", () => {
  const data = fixture();
  data.release.assets[0].digest = null;
  assert.throws(() => validateRelease({ ...data, tag, repository }), /missing a GitHub SHA-256 digest/);
});
