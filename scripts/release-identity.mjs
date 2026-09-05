import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function validatePackageVersion(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new Error(`Invalid numeric package version: ${version}`);
  const [major, minor, patch] = version.split(".").map(Number);
  if (major > 255 || minor > 255 || patch > 65535)
    throw new Error(
      "Version exceeds native MSI package limits; advance the release train",
    );
  return { major, minor, patch };
}
export function resolveIdentity({
  baseVersion,
  ref,
  event,
  runNumber,
  attempt,
  sha,
}) {
  const { major, minor } = validatePackageVersion(baseVersion);
  if (!/^[0-9a-f]{40}$/.test(sha))
    throw new Error("Exact source SHA is required");
  if (ref.startsWith("refs/tags/desktop-v")) {
    const tag = ref.slice("refs/tags/".length);
    if (tag !== `desktop-v${baseVersion}`)
      throw new Error("Stable tag must match source version");
    return { version: baseVersion, tag, channel: "stable", publish: true, sha };
  }
  if (event === "push" && ref === "refs/heads/main") {
    if (
      !Number.isSafeInteger(runNumber) ||
      runNumber < 1 ||
      !Number.isSafeInteger(attempt) ||
      attempt < 1 ||
      attempt > 99
    )
      throw new Error("Invalid workflow run/attempt identity");
    const version = `${major}.${minor + 1}.${runNumber * 100 + attempt}`;
    validatePackageVersion(version);
    return {
      version,
      tag: `desktop-latest-v${version}`,
      channel: "latest",
      publish: true,
      sha,
    };
  }
  return {
    version: baseVersion,
    tag: "",
    channel: "stable",
    publish: false,
    sha,
  };
}
export function applyVersion(root, version) {
  validatePackageVersion(version);
  for (const name of ["package.json", "src-tauri/tauri.conf.json"]) {
    const file = path.join(root, name),
      json = JSON.parse(fs.readFileSync(file, "utf8"));
    json.version = version;
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  }
  for (const directory of ["src-tauri", "src-tauri/sidecar"]) {
    const file = path.join(root, directory, "Cargo.toml");
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, "utf8")
        .replace(/^(version\s*=\s*)"[^"]+"/m, `$1"${version}"`),
    );
    const lock = path.join(root, directory, "Cargo.lock");
    if (fs.existsSync(lock))
      fs.writeFileSync(
        lock,
        fs
          .readFileSync(lock, "utf8")
          .replace(
            /(\[\[package\]\]\nname = "(?:desktop-release-canary|canary-sidecar)"\nversion = )"[^"]+"/g,
            `$1"${version}"`,
          ),
      );
  }
  const changelog = path.join(root, "CHANGELOG.md"),
    body = fs.readFileSync(changelog, "utf8");
  if (!body.includes(`## [${version}]`))
    fs.writeFileSync(
      changelog,
      `# Changelog\n\n## [${version}]\n\n- Continuous Latest build from the exact verified source commit.\n\n${body.replace(/^# Changelog\s*/, "")}`,
    );
}
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = path.resolve(import.meta.dirname, "..");
  if (process.argv[2] === "apply") {
    applyVersion(root, process.argv[3]);
  } else {
    const identity = resolveIdentity({
      baseVersion: JSON.parse(fs.readFileSync(path.join(root, "package.json")))
        .version,
      ref: process.env.GITHUB_REF,
      event: process.env.GITHUB_EVENT_NAME,
      runNumber: Number(process.env.GITHUB_RUN_NUMBER),
      attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
      sha: process.env.GITHUB_SHA,
    });
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        Object.entries(identity)
          .map(([key, value]) => `${key}=${value}\n`)
          .join(""),
      );
    console.log(JSON.stringify(identity));
  }
}
