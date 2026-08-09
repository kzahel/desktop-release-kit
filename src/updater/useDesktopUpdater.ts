import { getBundleType } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  check as checkForTauriUpdate,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";
import { installPolicy } from "./policy";
import { scheduleAutomaticChecks } from "./schedule";
import type { CheckReason, UpdaterState } from "./state";

const UPDATE_TIMEOUT_MS = 20_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface DesktopUpdater {
  state: UpdaterState;
  check(reason?: CheckReason): Promise<void>;
  install(): Promise<void>;
  dismiss(): void;
}

export function useDesktopUpdater(): DesktopUpdater {
  const [state, setState] = useState<UpdaterState>({ phase: "idle" });
  const updateRef = useRef<Update | null>(null);
  const checkRef = useRef<Promise<void> | null>(null);

  const closeUpdate = useCallback(() => {
    const update = updateRef.current;
    updateRef.current = null;
    if (update) void update.close().catch(console.error);
  }, []);

  const check = useCallback(
    async (reason: CheckReason = "manual") => {
      if (checkRef.current) {
        await checkRef.current;
        return;
      }

      const request = (async () => {
        if (reason === "manual") setState({ phase: "checking", reason });

        try {
          const bundleType = await getBundleType().catch(() => null);
          const policy = installPolicy(bundleType);
          if (!policy.canInstallInApp) {
            if (reason === "manual") {
              setState({
                phase: "manual-install",
                packageLabel: policy.packageLabel,
              });
            }
            return;
          }

          if (reason !== "manual" && updateRef.current) return;
          closeUpdate();
          const update = await checkForTauriUpdate({
            headers: { "X-Check-Reason": reason },
            timeout: UPDATE_TIMEOUT_MS,
          });

          if (update) {
            updateRef.current = update;
            setState({
              phase: "available",
              version: update.version,
              notes: update.body,
              reason,
            });
          } else if (reason === "manual") {
            setState({ phase: "up-to-date", reason });
          } else {
            setState({ phase: "idle", lastReason: reason });
          }
        } catch (error) {
          if (reason === "manual") {
            setState({
              phase: "error",
              operation: "check",
              message: errorMessage(error),
            });
          } else {
            console.error(`Automatic ${reason} update check failed:`, error);
          }
        } finally {
          checkRef.current = null;
        }
      })();

      checkRef.current = request;
      await request;
    },
    [closeUpdate],
  );

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update) {
      await check("manual");
      return;
    }

    const version = update.version;
    let downloadedBytes = 0;
    let totalBytes: number | undefined;
    setState({ phase: "downloading", version, downloadedBytes });

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          downloadedBytes = 0;
          totalBytes = event.data.contentLength;
          setState({
            phase: "downloading",
            version,
            downloadedBytes,
            totalBytes,
          });
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setState({
            phase: "downloading",
            version,
            downloadedBytes,
            totalBytes,
          });
        } else {
          setState({ phase: "installing", version });
        }
      });
      setState({ phase: "installing", version });
      await relaunch();
    } catch (error) {
      setState({
        phase: "error",
        operation: "install",
        message: errorMessage(error),
        version,
      });
    }
  }, [check]);

  const dismiss = useCallback(() => {
    closeUpdate();
    setState({ phase: "idle" });
  }, [closeUpdate]);

  useEffect(() => scheduleAutomaticChecks((reason) => void check(reason)), [check]);
  useEffect(() => closeUpdate, [closeUpdate]);

  return { state, check, install, dismiss };
}
