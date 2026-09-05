# Desktop Release Canary Testbed Runbook

Use this runbook to establish a real signed `N -> N+1` update on the macOS,
Windows, and Linux testbeds. The repository owns product assertions; the
common `machine-control` CLI and platform guides own VM lifecycle, transport, UI automation,
screenshots, and recovery.

The latest completed campaign is the
[`desktop-v0.1.0 -> desktop-v0.1.1` evidence record](evidence/desktop-v0.1.0-to-v0.1.1.md).

## Preconditions

- Both versions are public, finalized `desktop-v*` GitHub releases.
- The older installer and its `SHA256SUMS` entry are recorded before the newer
  release is published.
- `https://updates.graehlarts.com/health` returns `{"ok":true}`.
- The version endpoint under `/canary` reports the newer release.
- The controller inventory reports the intended testbeds as available.

From the dotfiles checkout:

```bash
mc=~/code/machine-control/bin/machine-control
$mc targets
$mc --target linux target doctor
workspace="$($mc --target linux workspace acquire --intent isolated \
  --reason 'canary update acceptance' \
  --claimant-authority maintainer --claimant-id canary-campaign)"
handle="$(jq -r '.data.handle' <<<"$workspace")"
claim="$(jq -r '.data.claim.claimId' <<<"$workspace")"
$mc --target linux --workspace "$handle" --claim "$claim" target up
$mc --target linux --workspace "$handle" --claim "$claim" target doctor
# Run the campaign, then release in cleanup:
$mc --target linux --claim "$claim" workspace release "$handle"
```

Read the common CLI and platform guides, acquire an exclusive claim and an
isolated workspace, and use target-native administration, semantics, and
capture. Release the workspace and claim when finished. Private inventories
select concrete targets; keep those values out of public evidence.

## Freeze the exact candidates

For both versions, record:

- Tag and commit SHA
- Workflow run URL
- Installer asset name and SHA-256
- `latest.json` version, target URL, and signature presence
- Testbed image/snapshot identity

Use the least-privileged self-contained profile for this campaign:

- macOS: install from the DMG by copying its App to `/Applications`; the
  in-app update consumes the signed `.app.tar.gz` artifact.
- Windows: install the per-user NSIS setup executable and update through NSIS.
- Linux: place the AppImage in a stable user-writable location and update that
  AppImage in place.

MSI, DEB, and RPM validate the manual package-ownership behavior separately.
The canary does not manufacture a reason to use a macOS PKG. Applications such
as JSTorrent may use the integrated PKG profile when they must register an
external native host, but they must separately prove that external component's
cross-version behavior.

## Per-platform update sequence

For one platform at a time:

1. Restore or prepare the clean testbed state defined by its provider.
2. Install exact version `N` from the frozen public release asset.
3. Launch the app and record version, target/architecture, bundle type,
   installation ID, webview build ID, and sidecar build ID.
4. Confirm the sidecar reports the same version as the application.
5. Select **Check now** and require version `N+1` plus release notes.
6. Select **Install and relaunch**.
7. Require a successful download, installation, process replacement, and one
   visible relaunched application.
8. Record version, webview build ID, and sidecar build ID after relaunch.
9. Require all three to identify version/build `N+1`; the installation ID must
   remain unchanged.
10. Quit the app and confirm no canary or sidecar process remains.

## Negative and package-channel checks

Run these without publishing deliberately bad production metadata:

- Disconnect networking and require a bounded visible manual-check failure.
- Trigger two manual checks rapidly and require one in-flight operation.
- Dismiss an available update, recheck, and require a clean rediscovery.
- Install MSI, DEB, and RPM variants and require `manual-install` rather than an
  in-app replacement attempt.
- Exercise invalid-signature, malformed-metadata, and missing-target behavior
  against local fixture servers or tests, never the production route.

## Evidence record

For each OS, retain:

- Before and after screenshots
- Structured runtime facts before and after
- Installer hashes
- Relevant updater request/log excerpt with private identifiers redacted
- Pass/fail result and exact failure ownership

Do not describe a platform as accepted because its CI build completed. CI owns
artifact construction and signing evidence; this campaign owns installed
behavior and cross-version evidence.

## Stable and Latest campaign

Freeze legacy signed `0.1.1`, new Stable `0.2.0`, and each complete Latest
release before installing. Record `release-identity.json`, workflow, tag, exact
source SHA, Linux ARM64 AppImage SHA-256, and updater metadata for each step.

1. Upgrade legacy Stable to `0.2.0` using its existing channel-less request.
2. Confirm Stable excludes any newer Latest candidate and notes.
3. Select Latest, verify its saved selection and immediate candidate, and leave
   it available long enough to establish that checks do not install it.
4. Explicitly install/relaunch. Require matching native, webview, and sidecar
   source IDs and the unchanged installation ID.
5. Push another relevant main change. Require CI to publish a distinct newer
   Latest without manually creating a release tag, then explicitly update to it.
6. Select Stable. Require the waiting-for-Stable state and no downgrade. Quit
   and relaunch to establish persistence.
7. Deliberately publish Stable `0.4.0`. Check and explicitly install it; require
   saved Stable, the unchanged installation ID, and all three build IDs matching.

Exercise the deterministic channel/cache/controller/native fixtures alongside
this installed campaign. Record exactly which installed OS was exercised;
the complete signed artifact matrix alone does not establish installed passes
on other platforms.
