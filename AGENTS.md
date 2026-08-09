# Repository Instructions

## Purpose

This repository owns the shared desktop update contract, its signed Tauri
canary application, and release-validation primitives intended for reuse by
Kyle Graehl's desktop applications. It is an operational reference, not a
product-specific UI starter.

Cross-project ownership and infrastructure context lives in
`~/code/dotfiles/projects/desktop-release-platform/README.md` when that
checkout is available. The generic multi-product service remains in
`~/code/simple-app-update-server`.

## Compatibility

Treat the update path as a distributed, cross-version protocol. Released apps,
GitHub release metadata, update-server code, product configuration, installers,
and testbed snapshots may all be on different versions. Prefer additive
changes, preserve the current `desktop-update-v1` behavior, and test an actual
older signed build updating to a newer signed build before calling a protocol
change complete.

## Validation

Run checks in proportion to the change and report exactly what ran:

```bash
pnpm install
pnpm check
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build --debug --bundles app
```

Cross-platform packaging, signing, installation, updater, and relaunch claims
require the relevant CI artifact or project-owned testbed evidence. A source
test does not establish a signed-update pass.

## Releases

Tagged workflows publish externally. Create or push a `desktop-v*` tag only
when the user explicitly requests a release. Keep incomplete releases in draft
state, and do not publish unless the finalizer accepts the complete artifact
and updater-metadata matrix.

The updater private key is per application. Never commit private keys,
passphrases, publisher credentials, or generated signing material. The public
key embedded in `src-tauri/tauri.conf.json` is intentionally public.

## Documentation

- `README.md` is the maintainer and consumer entry point.
- `contract/desktop-update-v1.md` owns normative client/server/release behavior.
- `docs/canary-testbed-runbook.md` owns the real old-to-new acceptance flow.
- Bounded implementation history belongs in commit messages rather than new
  planning documents unless the work needs a continuing decision record.

Update the contract when behavior changes. Keep application-specific branding,
lifecycle, sidecar architecture, and product UI outside the shared contract.

## Commits

Aim for a subject of 65 characters or fewer and wrap nontrivial commit bodies
at 72 columns. Preserve intent, constraints, validation, and deliberate
deferrals when useful. Do not add AI attribution or co-author trailers.

Before pushing, verify `git config user.name` and `git config user.email` are
the maintainer's identity rather than automation placeholders.
