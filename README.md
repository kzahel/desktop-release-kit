# Desktop Release Kit

Desktop Release Kit is a deliberately small Tauri application and release
pipeline for proving Kyle Graehl's shared desktop update infrastructure. It is
the long-lived canary for signed packaging, update routing, download,
installation, relaunch, bundled resources, and a nested native sidecar on
macOS, Windows, and Linux.

It is intentionally boring. Product repositories should adopt its contracts
and proven primitives without inheriting its identity, updater key, endpoint,
or visual design.

## What lives here

- The Desktop Release Canary Tauri application.
- The normative [`desktop-update-v1`](contract/desktop-update-v1.md) contract.
- A product configuration consumed by the shared
  [`simple-app-update-server`](https://github.com/kzahel/simple-app-update-server).
- Release configuration and draft-finalization validators.
- A real old-to-new [testbed acceptance runbook](docs/canary-testbed-runbook.md).

The generic server stays separate. Each consuming product continues to own its
branding, lifecycle, product UI, release tag, endpoint route, and updater key.

## Canary topology

```text
Desktop Release Canary
  GET updates.graehlarts.com/canary/tauri/{target}/{arch}/{version}
    -> Caddy on Remy
    -> one simple-app-update-server process
    -> desktop-release-canary product config
    -> public GitHub Releases in kzahel/desktop-release-kit
```

GitHub hosts the immutable artifacts. The shared server routes and aggregates
release metadata; it does not proxy installer bytes.

## Local development

Requirements:

- Node.js and pnpm
- Rust stable with the current host target
- Tauri's platform prerequisites

```bash
pnpm install
pnpm check
pnpm tauri dev
```

The `prepare-sidecar` command compiles a tiny target-specific binary and stages
it under `src-tauri/binaries/` using Tauri's required target-triple naming.
Both the webview and sidecar expose build IDs so an update test can establish
that the complete installed application was replaced.

For a local bundled smoke test:

```bash
pnpm tauri build --debug --bundles app
```

## Release invariants

Pushing `desktop-vX.Y.Z` starts the signed release workflow. A release stays a
draft until all five updater targets are present and validated:

- macOS Apple silicon
- macOS Intel
- Windows x86_64, using NSIS for in-app updates
- Linux x86_64, using AppImage for in-app updates
- Linux ARM64, using AppImage for in-app updates

The finalizer also requires the normal DMG, MSI, DEB, and RPM installer matrix,
checks every updater URL and detached signature, writes `SHA256SUMS`, removes
redundant detached signature assets after validation, and only then publishes.

The canary's default installed path is deliberately non-privileged: DMG to App
on macOS, per-user NSIS on Windows, and an AppImage in a user-writable location
on Linux. Products that must register resources outside their macOS App bundle
may deliberately use the contract's integrated PKG profile; that is a product
capability exception, not the shared default.

Tagged releases require:

- A unique Tauri updater key and passphrase
- Shared Developer ID and App Store Connect notarization credentials
- Shared Azure Trusted Signing credentials

Credential names and provisioning are documented in the private maintainer
runbook at `~/code/dotfiles/runbooks/desktop-code-signing.md`. No private
material belongs in this repository.

## Adopting the pattern

Start from the contract and release validators. Do not copy these values:

- `com.kzahel.desktop-release-canary`
- `updates.graehlarts.com/canary`
- The embedded canary updater public key
- `desktop-release-canary` product ID

Generate a per-app updater key, choose a product-owned route, and validate the
new application against its own older signed release. Shared packages or
reusable workflows will be extracted only after the canary and at least one
existing application prove the same boundary.

## License

MIT
