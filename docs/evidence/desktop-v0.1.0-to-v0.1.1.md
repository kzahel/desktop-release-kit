# Desktop Canary 0.1.0 to 0.1.1 Acceptance

Date: 2026-08-09

Result: **passed** for the self-contained macOS App, Windows per-user NSIS,
and Linux AppImage update profiles.

This record omits installation UUIDs, IP addresses, VM machine identifiers,
and private local screenshot paths. Before, available-update, and after
screenshots were retained outside the repository.

## Frozen releases

| Release | Commit | Workflow | Published |
| --- | --- | --- | --- |
| [`desktop-v0.1.0`](https://github.com/kzahel/desktop-release-kit/releases/tag/desktop-v0.1.0) | `0448083f42f9b248b2e050a29d3cce98bfb3a8c9` | [successful run](https://github.com/kzahel/desktop-release-kit/actions/runs/31309938260) | 2026-08-09 11:31 UTC |
| [`desktop-v0.1.1`](https://github.com/kzahel/desktop-release-kit/releases/tag/desktop-v0.1.1) | `bf3edaef52b3f6f7daf47161f9996f2eb5a74e35` | [successful run](https://github.com/kzahel/desktop-release-kit/actions/runs/31312673086) | 2026-08-09 12:35 UTC |

Both releases were public and non-draft. The `0.1.1` finalizer accepted all
five updater targets, the complete installer matrix, detached updater
signatures, GitHub asset digests, and the merged `latest.json` file. CI also
validated Developer ID signing, notarization, and stapling for both macOS
architectures, plus Authenticode signatures on Windows NSIS, MSI, and the
nested sidecar.

### Installed candidate hashes

| OS | Asset | 0.1.0 SHA-256 | 0.1.1 SHA-256 |
| --- | --- | --- | --- |
| macOS | `Desktop.Release.Canary_0.1.x_aarch64.dmg` | `b87cfe5345a70536dadbec61cc0c99cf89ddfaea6e4197df6dbc6427884776cb` | `ccab8f2e010f1291b8da811fc69ab827c1dc5c45f2e307462ed24c4975c2456e` |
| Windows | `Desktop.Release.Canary_0.1.x_x64-setup.exe` | `6ea9fb131a9419f57f2a6600f62e94a08155617d5e41b2ef5829b2af37847b81` | `e870afdda19363250bf6a6d3d259029de86fb854f1262c054b48da6c33dfc3be` |
| Linux | `Desktop.Release.Canary_0.1.x_aarch64.AppImage` | `54ef1ee137ccf6f69efb5739d89c1df35f5d3b93cc571b6d6fc3d93da4c7ec2d` | `40ea4bd08a6f81a73ec5a3e2cf3394dd10d9f03487b8cdda968a62773dffcc97` |

The downloaded assets matched each release's `SHA256SUMS`. Every relevant
`latest.json` entry reported version `0.1.1`, used a URL under that exact
release, and carried a non-empty signature. The live shared route returned
`200` with `0.1.1` for older clients and `204` for current clients on all five
target/architecture pairs.

## Testbeds

| OS | Guest and provider | Installed profile |
| --- | --- | --- |
| macOS | macOS 26.2 (25C56), ARM64; `macvm-testbed` at `cd4780b04250f6ee0444a8642812d372fd68e2cd` | DMG copied to `/Applications` as an App |
| Windows | Windows 11 Pro 10.0.26200, ARM64 guest; `winvm-testbed` at `8bda9fa9bab81d9b057dbeebb493b20c434b035d` | x86_64 per-user NSIS under Windows emulation |
| Linux | Ubuntu 24.04.4 LTS, ARM64, GNOME Wayland; `linuxvm-testbed` at `087961ffd523e589d5aa0d2a94cc485e040b4329` | ARM64 AppImage in the desktop user's `Applications` directory |

The Windows test preserved an unrelated running JSTorrent installation and
its data throughout the campaign.

## Installed update results

All three `0.1.0` installations initially reported app and sidecar version
`0.1.0` with webview and sidecar build ID
`0448083f42f9b248b2e050a29d3cce98bfb3a8c9`. Each manual check displayed
signed update `0.1.1` and its release notes before installation.

| Assertion | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Download, replace, and relaunch | Pass | Pass | Pass after testbed supervisor correction described below |
| Installed app version | `0.1.1` | `0.1.1` | `0.1.1` |
| Webview build ID | `bf3edaef52b3f6f7daf47161f9996f2eb5a74e35` | same | same |
| Sidecar version/build ID | `0.1.1` / same commit | same | same |
| Installation identity | Unchanged, value redacted | Unchanged, value redacted | Unchanged, value redacted |
| Relaunched visible apps | One | One | One |
| Orphan sidecar processes | Zero | Zero | Zero |

Additional platform evidence:

- The updated macOS App passed `codesign --verify --deep --strict`, Gatekeeper
  assessment as a notarized Developer ID application, and staple validation.
- The installed Windows app and sidecar retained valid Authenticode
  signatures from Kyle Graehl. The update changed the app PID, and `0.1.1`
  no longer opened the extra Windows Terminal console seen with `0.1.0`.
- Linux replaced the running file in place, so its filename still contains
  `0.1.0` while its bytes match the frozen `0.1.1` AppImage hash. AppImage
  runtime helpers remained inside the tracked launch cgroup and exited after
  the application quit.
- The Linux guest emitted non-fatal GVfs, canberra GTK module, and EGL/DRI2
  warnings while both versions remained usable.

After capture, each application quit normally with zero app and sidecar
processes. macOS was suspended and Linux was paused. Windows' graceful VM
shutdown timed out while the unrelated JSTorrent app remained open, so the VM
was deliberately left started rather than force-stopped.

## Linux testbed correction

The first Linux attempt replaced the AppImage successfully but did not leave a
visible relaunched process. The application had been launched as a transient
systemd user service with the default main-process exit semantics. When Tauri
spawned the replacement process and exited the old PID, systemd stopped the
unit and killed the new child.

A controlled guest probe reproduced that ownership failure. The provider was
changed to launch GUI services with `ExitType=cgroup`, which keeps the service
active for the whole process group across self-relaunch while preserving
normal stop and collection behavior. The live LinuxVM smoke suite passed, the
fix was committed as
[`087961f`](https://github.com/kzahel/linuxvm-testbed/commit/087961ffd523e589d5aa0d2a94cc485e040b4329),
and the exact frozen `0.1.0` AppImage was restored before the successful retry.

## Shared-server evidence

Redacted NDJSON entries on the shared server recorded the real
`tauri-plugin-updater/2.10.1` clients. For each installed profile, the log
sequence was:

| Target | Initial startup | Manual discovery | Relaunched startup |
| --- | --- | --- | --- |
| `darwin/aarch64` | `0.1.0 -> 0.1.0`, unavailable | `0.1.0 -> 0.1.1`, available | `0.1.1 -> 0.1.1`, unavailable |
| `windows/x86_64` | `0.1.0 -> 0.1.0`, unavailable | `0.1.0 -> 0.1.1`, available | `0.1.1 -> 0.1.1`, unavailable |
| `linux/aarch64` | `0.1.0 -> 0.1.0`, unavailable | `0.1.0 -> 0.1.1`, available | `0.1.1 -> 0.1.1`, unavailable |

The Linux retry additionally recorded startup rediscovery and a second manual
discovery from `0.1.0`. IP addresses and `X-CFU-Id` values were removed from
the retained excerpts.

## Validation and scope

Local source validation passed:

- `pnpm check` (10 Vitest tests, configuration validation, and 11 release-tool
  tests)
- Rust formatting for the application and sidecar
- Rust clippy with warnings denied for the application and sidecar
- Rust tests for the application and sidecar
- `pnpm tauri build --debug --bundles app --no-sign`
- `linuxvm-testbed/tests/smoke.sh`

This campaign accepted the normal self-contained in-app update profiles. It
did not install MSI, DEB, or RPM packages or perform production-route fault
injection. The package-boundary and malformed-metadata behavior remained
covered by source tests; installed package-manager and negative-path checks
remain separate runbook work.
