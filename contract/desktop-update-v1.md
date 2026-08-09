# Desktop Update Contract v1

Status: accepted for the Desktop Release Canary.

This document defines the interoperable behavior shared by the canary, update
service, release metadata, and desktop release pipeline. Product presentation
may differ. Protocol or behavioral changes must preserve compatibility with
already released v1 clients or introduce an additive successor.

## Participants and ownership

| Participant | Owns |
| --- | --- |
| Application | Embedded endpoint and public key, current version, installation identity, check scheduling, user-visible state, package policy, download/install/relaunch |
| Product repository | Product config, release tags, changelog, workflow, private updater key in CI, immutable artifacts |
| Shared update server | Host/path routing, GitHub release aggregation, target selection, release-note aggregation, analytics, stale-cache fallback |
| GitHub Releases | Public immutable installer bytes, `latest.json`, asset digests |
| Testbed campaign | Exact older installer, user-visible interaction, updater request, relaunch, new application and sidecar identity |

Deployments are independent. The server, app, product configuration, release
metadata, and installed client must not require an atomic cutover.

## Version and release identity

- Versions are stable three-component semantic versions: `MAJOR.MINOR.PATCH`.
- The canary release tag is `desktop-v<version>`.
- `package.json`, `src-tauri/Cargo.toml`, `tauri.conf.json`, the changelog, tag,
  and `latest.json` must agree.
- Draft releases are not eligible for update checks.
- The finalizer is the only workflow participant allowed to make a release
  public.

## Product routing

The canonical Tauri route is:

```text
https://updates.graehlarts.com/canary/tauri/{{target}}/{{arch}}/{{current_version}}
```

The server selects the product using hostname plus the longest matching path
prefix. Existing route meaning is stable for all released v1 clients.

The server returns:

- `200` plus the Tauri update object when a newer compatible target exists.
- `204` when the client is current, ahead, or has no compatible artifact.
- An error response when release metadata cannot safely be resolved.

Clients must fail closed. An update without a valid signature from the embedded
per-app public key is never installed.

## Request metadata

Every application instance has a random UUID stored in its platform
application-config directory. It is stable for that installation and sent as:

```text
X-CFU-Id: <uuid>
```

The identifier estimates active installations. It contains no user, account,
document, hostname, or device data and may be reset by deleting application
state. Server logs remain private on Remy.

Each check carries exactly one reason:

```text
X-Check-Reason: startup | periodic | manual | host
```

Unknown reasons are retained for diagnosis but are not part of v1. Product
hosts may use `host` when a separately running native component performs the
check.

## Scheduling and concurrency

- Schedule one silent startup check five seconds after initialization.
- Schedule one silent periodic check every 24 hours while the application is
  running.
- Expose an explicit manual check.
- Deduplicate concurrent checks.
- Use a bounded network timeout; the canary uses 20 seconds.
- Keep an already discovered update intact during later silent checks.
- Automatic failures are logged without interrupting the user.
- Manual results and failures are visible.

## User-visible state

The implementation must be able to represent:

```text
idle
checking
up-to-date
available
manual-install
downloading
installing
error(check | install)
```

The available state includes version and release notes. Downloading reports
bytes and determinate progress when content length is known. Installation is
an explicit user action and relaunches only after Tauri reports success.
Failures retain an appropriate retry path.

## Package ownership

In-app installation is allowed for packages whose replacement Tauri owns:

- macOS `.app` update artifact
- Windows NSIS installation
- Linux AppImage

System package channels stay with their package manager:

- Windows MSI
- Linux DEB
- Linux RPM

Those installations show a manual-download/package-channel path instead of
attempting in-app replacement.

## Release artifact matrix

`latest.json` must contain signed entries for:

```text
darwin-aarch64   -> .app.tar.gz
darwin-x86_64    -> .app.tar.gz
windows-x86_64   -> -setup.exe
linux-x86_64     -> .AppImage
linux-aarch64    -> .AppImage
```

Every updater URL must resolve to an asset in the same tagged GitHub release,
and the corresponding detached `.sig` must exist while the draft is being
validated. Normal installers must also include both macOS DMGs, Windows NSIS
and MSI, and AppImage/DEB/RPM packages for both Linux architectures.

GitHub-provided SHA-256 digests are required for every release asset. The
finalizer writes a stable `SHA256SUMS` after validating the draft.

## Signing boundaries

- The Tauri updater key is unique to the application.
- The private updater key and passphrase exist only in maintainer secret
  storage and repository Actions secrets.
- The public updater key is embedded in the application and is not secret.
- Developer ID and Azure Trusted Signing credentials may be shared by apps
  from the same publisher.
- Tagged macOS artifacts require Developer ID signing, notarization, and a
  stapled ticket.
- Tagged Windows NSIS and MSI artifacts require a valid Authenticode signature
  from the expected publisher.
- Missing credentials fail a tagged build before release publication.

## Acceptance evidence

Source, unit, and metadata tests are necessary but do not establish a working
update. Acceptance requires an exact older public signed installer on each
supported testbed, a check through the production route, signed installation,
relaunch, and confirmation that all of these changed coherently:

- Application version
- Webview build ID
- Nested sidecar version and build ID

Record failures by ownership boundary: application, release artifact, update
service, GitHub delivery, testbed provider, or environment.
