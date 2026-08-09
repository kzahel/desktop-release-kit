export type CheckReason = "startup" | "periodic" | "manual";

export type UpdaterState =
  | { phase: "idle"; lastReason?: CheckReason }
  | { phase: "checking"; reason: CheckReason }
  | { phase: "up-to-date"; reason: "manual" }
  | { phase: "available"; version: string; notes?: string; reason: CheckReason }
  | { phase: "manual-install"; packageLabel: string }
  | {
      phase: "downloading";
      version: string;
      downloadedBytes: number;
      totalBytes?: number;
    }
  | { phase: "installing"; version: string }
  | {
      phase: "error";
      operation: "check" | "install";
      message: string;
      version?: string;
    };

export function progressPercent(state: UpdaterState): number | undefined {
  if (
    state.phase !== "downloading" ||
    !state.totalBytes ||
    state.totalBytes <= 0
  ) {
    return undefined;
  }
  return Math.min(
    100,
    Math.round((state.downloadedBytes / state.totalBytes) * 100),
  );
}
