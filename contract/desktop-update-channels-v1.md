# Desktop update channels extension v1

Status: implemented contract; installed acceptance pending.

This additive extension preserves [desktop-update-v1](desktop-update-v1.md).
Released endpoints, keys, and requests without a channel retain Stable meaning.

## Discovery and routing

`GET <product>/channels` returns `{"schemaVersion":1,"channels":[{"id":"stable","displayName":"Stable"},{"id":"latest","displayName":"Latest"}]}`.
Only configured channels are advertised. New clients must discover support
before requesting Latest; an old server ignoring a query is never support.
Stable may fall back to its unchanged v1 endpoint on a 404 discovery response.
Other discovery failures fail the check and preserve the setting.

Update and version routes accept exactly one `?channel=<id>`. Omission means
Stable. Empty, duplicate, malformed, and unsupported explicit channels return
400 with an explanation. Responses include `X-Update-Channel`. Channel-capable
clients also require this header on explicit checks. Each channel has independent
candidates, notes, memory/disk cache, stale fallback and log identity. Existing
Stable cache files remain Stable; additional channel caches start empty.

Channel IDs match `[a-z][a-z0-9-]{0,31}`. The product registry defines display
metadata and explicit selection by tag prefix and GitHub release kind
(`release` or `prerelease`). Stable must retain the legacy tag prefix and
non-prerelease selection. Drafts never qualify. A future Beta is an additive
registry/release-policy change; it is not offered by this canary.

## Canary version and publication policy

The canary uses numeric semantic versions for both tracks, preserving native
package ordering without prerelease-to-MSI conversion. A deliberate Stable
`M.m.p` uses tag `desktop-vM.m.p`. CI Latest uses `M.(m+1).S`, where
`S = workflow run number * 100 + run attempt`, tag
`desktop-latest-vM.(m+1).S`, and GitHub `prerelease=true`. Attempts are 1–99;
S must be <=65535 and both major/minor <=255. Exceeding these limits fails
before packaging and requires advancing the release train. This conservative
mapping fits MSI, NSIS, macOS bundle versions, DEB and RPM. All application,
webview, sidecar, manifests and native package versions use that same identity.
The source SHA is recorded separately as the build ID and release provenance.

For example: Stable 0.2.0 < Latest 0.3.101 < Latest 0.3.102 < Latest 0.3.201
< deliberate Stable 0.4.0. The latter starts a new Latest train at 0.5.S.
Promotion is a new deliberate Stable release with a greater numeric version;
an existing prerelease is never reclassified or overwritten. Arbitrary
prereleases with other tag prefixes are ineligible.

Relevant main pushes verify their exact commit then build all five signed
updater targets through the existing workflow. All jobs resolve the same
identity. Publication is serialized without cancelling an active publisher;
obsolete pending runs coalesce. Releases are immutable after publication.
Finalization requires the complete artifact/signature matrix. Failed drafts
remain private. Server selection sorts numerically, never by publication time,
so late old releases cannot replace a newer candidate. PRs only verify.

## Client state and lifecycle

The native application persists the selected channel per installation. Missing
or invalid old settings default to Stable. Endpoints and keys are native-owned;
the UI only selects an allowlisted channel ID. A switch invalidates the previous
candidate immediately, persists the new selection and starts a manual check.
Old in-flight responses cannot replace new-channel state. Installation and
selection are mutually exclusive; retained update handles belong to one check
and channel and are closed when discarded. Dismissal invalidates in-flight UI
results. Automatic checks never download, install, relaunch, or focus the app.
An explicit Update action downloads, verifies, installs, and relaunches.
Package-manager distributions retain manual installation policy.

Switching back to Stable persists immediately and never downgrades. When the
installed version exceeds the available Stable version, show waiting for Stable
to catch up. A later greater Stable release is offered normally. Checking is
scheduled after five seconds and every 30 minutes on Latest, every 24 hours on
Stable; concurrent checks and install operations are deduplicated.

## Acceptance

Source fixtures, native comparator checks, all-platform signed artifacts and
one installed machine-control campaign are required for the first channel proof.
Record the exact tested OS/architecture and untested installed platforms.
Source checks alone are not end-to-end acceptance.
