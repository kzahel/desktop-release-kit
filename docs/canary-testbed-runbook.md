# Desktop Release Canary Testbed Runbook

Use this runbook to establish a real signed `N -> N+1` update on the macOS,
Windows, and Linux testbeds. The repository owns product assertions; the
standalone testbed repositories own VM lifecycle, transport, UI automation,
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
python3 ~/code/dotfiles/testbeds/testbeds.py status
python3 ~/code/dotfiles/testbeds/testbeds.py guide macvm
python3 ~/code/dotfiles/testbeds/testbeds.py guide winvm
python3 ~/code/dotfiles/testbeds/testbeds.py guide linuxvm
```

Read each provider's authoritative guide before changing VM state.

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
