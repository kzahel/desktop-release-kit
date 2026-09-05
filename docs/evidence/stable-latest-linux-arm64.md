# Stable and Latest installed acceptance

Date: 2026-09-05. Status: installed acceptance passed.

This campaign uses an isolated Ubuntu 24.04.4 LTS GNOME Wayland ARM64
workspace through Machine Control `5801e4acc9d46bedf376ae7f7ebfca6e527d0322`. Public evidence omits installation
UUIDs, machine identities, addresses, private paths, and operational logs.
macOS and Windows installed channel behavior is not exercised in this campaign.
The release workflow still requires all five signed updater targets.

## Frozen releases

| Track | Version | Source | Workflow | Result |
| --- | --- | --- | --- | --- |
| Legacy Stable | 0.1.1 | `bf3edaef52b3f6f7daf47161f9996f2eb5a74e35` | [31312673086](https://github.com/kzahel/desktop-release-kit/actions/runs/31312673086) | Public, installed baseline |
| Stable | 0.2.0 | `40b25c1cd8ec28bbd83398f2e19401ac8243cdd8` | [33974983503](https://github.com/kzahel/desktop-release-kit/actions/runs/33974983503) | Public, installed |
| Latest | 0.3.901 | `40b25c1cd8ec28bbd83398f2e19401ac8243cdd8` | [33974947605](https://github.com/kzahel/desktop-release-kit/actions/runs/33974947605) | Public, installed |
| Latest | 0.3.1101 | `577302786a28cd11bf445fc19b2f0ab70c1f4702` | [33975315620](https://github.com/kzahel/desktop-release-kit/actions/runs/33975315620) | Public, installed |
| Stable catch-up | 0.4.0 | `6e6cd56f046324a50ddfff6ac18016f6f3fa5c83` | [33978842519](https://github.com/kzahel/desktop-release-kit/actions/runs/33978842519) | Public, installed |
| Next automatic Latest | 0.5.1201 | `6e6cd56f046324a50ddfff6ac18016f6f3fa5c83` | [33978840903](https://github.com/kzahel/desktop-release-kit/actions/runs/33978840903) | Public, verified; not installed |

The legacy ARM64 AppImage SHA-256 is
`40ea4bd08a6f81a73ec5a3e2cf3394dd10d9f03487b8cdda968a62773dffcc97`.
The frozen download and running file match its public `SHA256SUMS` entry.
The baseline has one visible canary process, native/sidecar version `0.1.1`,
and matching webview/sidecar source IDs. Its missing channel setting defaults
to legacy Stable.

## Deployment and compatibility

The shared server's channel implementation is `46a8a8e`. The rebuilt service
was deployed with only the canary product opting into Stable and Latest.
All ten existing product version routes retained their predeployment Stable
response; every non-canary product configuration hash remained unchanged.

Before any new release was public, the production canary route returned
Stable `0.1.1` and preserved signed metadata for all five updater targets.
Unknown explicit channels returned 400. Latest had no candidate and returned
an error carrying its channel identity, without substituting Stable.

## Installed sequence

Passed: legacy `0.1.1 -> 0.2.0`, then `0.2.0 -> 0.3.901` after selecting
Latest. Both changed the running process and installed file hash, preserved the
installation ID, and relaunched with matching app/sidecar version and build IDs.
Latest was saved before installation and remained selected after relaunch.
While the Latest candidate was visible, the installed hash and PID remained
unchanged until the explicit Update action.

The subsequent main commit automatically published `0.3.1101`, which was
also explicitly installed and relaunched with its exact hash and source ID.
Returning to Stable saved the setting and showed **Waiting for Stable to catch
up** without changing the installed `0.3.1101` hash or process. After quitting
and launching again, Stable remained selected and the same waiting state
returned. The installation ID stayed unchanged throughout.

Stable `0.4.0` was offered while automatic Latest `0.5.1201` was also public.
The installed `0.3.1101` hash and process remained unchanged until the explicit
Update action. Installation and relaunch produced the frozen `0.4.0` hash, one
visible application, saved Stable, the unchanged installation ID, and matching
native, webview and sidecar source IDs `6e6cd56f046324a50ddfff6ac18016f6f3fa5c83`.
All five default Stable updater target routes returned 204 at `0.4.0`, with
`X-Update-Channel: stable`, despite the numerically greater Latest release.

## Frozen ARM64 AppImage hashes

| Version | SHA-256 |
| --- | --- |
| 0.1.1 | `40ea4bd08a6f81a73ec5a3e2cf3394dd10d9f03487b8cdda968a62773dffcc97` |
| 0.2.0 | `f701179dac660fb51b5fc1473cd8ac380b043cc239d22802470e055bf050d693` |
| 0.3.901 | `a5d4d211b7ba16c82e7d78c94c2cecdeb76eaa551ced66407a84732d1c5ae62e` |
| 0.3.1101 | `f66d0e431897c4665a53fdedf26f91d90949e57e1b38108ffc3948b3e14e1848` |
| 0.4.0 | `45c91199e5c3a6792647d00634fac7e9962e523ea50a05bfb4c5912ed4ae5623` |
| 0.5.1201 (not installed) | `45f30249b289001ffea763dd15e49a707c94f0380e6679a1de33b929c5d16359` |

Every frozen release passed its full workflow. Tags resolve to the recorded
commit, and `release-identity.json` agrees with the tag, track, version and exact
source SHA. Downloaded AppImages match both GitHub asset digests and the
release's `SHA256SUMS`. The installed AppImage remains at one user-writable
path across replacements.

## Source and fixture evidence

- Shared server: 71 tests, typechecking, formatting, and bundled build.
- Canary: 20 frontend tests and 16 configuration/release-tool tests.
- Native: old-server Stable fallback, unsupported Latest, channel confirmation,
  network errors, waiting for Stable, saved settings, and version ordering.
- The real Tauri updater downloads altered bytes against the public `0.1.1`
  ARM64 signature and rejects them cryptographically before installation.
- Local Rust formatting, clippy with warnings denied, eight native tests, and
  unsigned local app bundling. Signed and installed claims use the CI and VM
  evidence above.

## Redacted production requests

These requests came from the same installation. Times are UTC on 2026-09-05;
private installation and network identifiers are omitted.

| Time | Track | Installed | Candidate | Update available | Reason |
| --- | --- | --- | --- | --- | --- |
| 16:31:48 | stable | 0.1.1 | 0.2.0 | true | startup |
| 16:32:53 | stable | 0.2.0 | 0.2.0 | false | startup |
| 16:34:20 | latest | 0.2.0 | 0.3.901 | true | manual |
| 16:35:46 | latest | 0.3.901 | 0.3.901 | false | startup |
| 16:38:06 | latest | 0.3.901 | 0.3.1101 | true | manual |
| 16:42:15 | latest | 0.3.1101 | 0.3.1101 | false | startup |
| 16:43:48 | stable | 0.3.1101 | 0.2.0 | false | manual |
| 16:43:53 | stable | 0.3.1101 | 0.2.0 | false | startup |
| 16:45:58 | stable | 0.3.1101 | 0.2.0 | false | startup |
| 17:12:09 | stable | 0.3.1101 | 0.4.0 | true | manual |
| 17:14:28 | stable | 0.4.0 | 0.4.0 | false | startup |

## Controller network recovery

The first workspace lost outbound connectivity during CI. Its update check
failed without changing the installed artifact, and an independent guest curl
also timed out. The Mac controller routed the guest subnet through its Tailscale
exit node rather than the VM bridge. A LAN-access exception still routed that
subnet through the physical gateway. Temporarily removing the exit-node route
and recreating the disposable workspace restored the bridge route and guest
HTTPS access. The exact frozen legacy AppImage was reinstalled before the
accepted sequence; application endpoints, keys, and public release metadata
were unchanged. Cleanup restored and verified the original exit-node selection
and LAN-access setting, with Tailscale still running.

## Cleanup

Stopped the application and confirmed zero canary or sidecar processes.
Machine Control discarded the isolated workspace and released its claim; the
target claim is available again, temporary workspace count is zero, and the
base target reports stopped/power off. Controller network preferences were restored
and verified. Private captures, runtime facts, and frozen assets remain in the
ignored local campaign artifact directory.
