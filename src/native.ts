import { getBundleType, getVersion, type BundleType } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

export interface CanaryInfo {
  version: string;
  target: string;
  arch: string;
  installationId: string;
  endpoint: string;
}

export interface SidecarProbe {
  schemaVersion: 1;
  version: string;
  buildId: string;
  target: string;
  arch: string;
}

export interface RuntimeFacts extends CanaryInfo {
  bundleType: BundleType | null;
  webviewBuildId: string;
  sidecar: SidecarProbe;
}

export async function loadRuntimeFacts(): Promise<RuntimeFacts> {
  const [native, bundleType, apiVersion, sidecar] = await Promise.all([
    invoke<CanaryInfo>("get_canary_info"),
    getBundleType().catch(() => null),
    getVersion(),
    invoke<SidecarProbe>("probe_sidecar"),
  ]);
  if (native.version !== apiVersion) {
    throw new Error(
      `Native version ${native.version} does not match Tauri API version ${apiVersion}`,
    );
  }
  return {
    ...native,
    bundleType,
    webviewBuildId: __CANARY_BUILD_ID__,
    sidecar,
  };
}
