import { getBundleType } from "@tauri-apps/api/app";
import { Channel, invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect, useState } from "react";
import {
  UpdaterController,
  type CheckResult,
  type Progress,
  type Snapshot,
  type Track,
} from "./controller";
import { installPolicy } from "./policy";
import { scheduleAutomaticChecks } from "./schedule";
import type { CheckReason } from "./state";

export function useDesktopUpdater() {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    state: { phase: "idle" },
    track: "stable",
    selecting: false,
    ready: false,
  });
  const [controller] = useState(
    () =>
      new UpdaterController(
        {
          load: () => invoke<Track>("get_update_channel"),
          select: (track) => invoke("set_update_channel", { track }),
          clear: () => invoke("clear_update"),
          check: (reason) => invoke<CheckResult>("check_update", { reason }),
          install: async (onProgress) => {
            const progress = new Channel<Progress>();
            progress.onmessage = onProgress;
            await invoke("install_update", { progress });
          },
          relaunch,
          policy: async () =>
            installPolicy(await getBundleType().catch(() => null)),
        },
        setSnapshot,
      ),
  );
  useEffect(() => {
    void controller.initialize();
    return () => controller.dispose();
  }, [controller]);
  useEffect(() => {
    if (!snapshot.ready) return;
    return scheduleAutomaticChecks(
      (reason) => void controller.check(reason),
      globalThis,
      snapshot.track,
    );
  }, [controller, snapshot.ready, snapshot.track]);
  return {
    ...snapshot,
    check: (reason: CheckReason = "manual") => controller.check(reason),
    select: (track: Track) => controller.select(track),
    install: () => controller.install(),
    dismiss: () => void controller.dismiss(),
  };
}
