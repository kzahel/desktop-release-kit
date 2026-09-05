import type { CheckReason, UpdaterState } from "./state";

export type Track = "stable" | "latest";
export interface CheckResult {
  track: Track;
  version: string | null;
  notes: string | null;
  waitingForStable: boolean;
}
export interface Progress {
  downloadedBytes: number;
  totalBytes?: number;
  installing: boolean;
}
export interface Bridge {
  load(): Promise<Track>;
  select(track: Track): Promise<void>;
  clear(): Promise<void>;
  check(reason: CheckReason): Promise<CheckResult>;
  install(progress: (event: Progress) => void): Promise<void>;
  relaunch(): Promise<void>;
  policy(): Promise<{ canInstallInApp: boolean; packageLabel: string }>;
}
export interface Snapshot {
  state: UpdaterState;
  track: Track;
  selecting: boolean;
  ready: boolean;
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export class UpdaterController {
  snapshot: Snapshot = {
    state: { phase: "idle" },
    track: "stable",
    selecting: false,
    ready: false,
  };
  private generation = 0;
  private checking: Promise<void> | null = null;
  private installing = false;
  private candidate: string | null = null;
  constructor(
    private bridge: Bridge,
    private changed: (snapshot: Snapshot) => void,
  ) {}
  private emit(update: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.changed(this.snapshot);
  }
  async initialize() {
    try {
      this.emit({ track: await this.bridge.load(), ready: true });
    } catch (error) {
      this.emit({
        state: { phase: "error", operation: "check", message: message(error) },
      });
    }
  }
  async select(track: Track) {
    if (this.installing || this.snapshot.selecting || !this.snapshot.ready)
      return;
    this.generation++;
    this.checking = null;
    this.candidate = null;
    this.emit({ selecting: true, state: { phase: "idle" } });
    try {
      await this.bridge.select(track);
      this.emit({ track, selecting: false });
      await this.check("manual");
    } catch (error) {
      this.emit({
        selecting: false,
        state: { phase: "error", operation: "check", message: message(error) },
      });
    }
  }
  async check(reason: CheckReason = "manual"): Promise<void> {
    if (!this.snapshot.ready || this.installing || this.snapshot.selecting)
      return;
    if (this.checking) return this.checking;
    if (reason !== "manual" && this.candidate) return;
    const generation = ++this.generation;
    this.candidate = null;
    if (reason === "manual")
      this.emit({ state: { phase: "checking", reason } });
    const task = (async () => {
      try {
        const policy = await this.bridge.policy();
        if (generation !== this.generation) return;
        if (!policy.canInstallInApp) {
          if (reason === "manual")
            this.emit({
              state: {
                phase: "manual-install",
                packageLabel: policy.packageLabel,
              },
            });
          return;
        }
        const result = await this.bridge.check(reason);
        if (
          generation !== this.generation ||
          result.track !== this.snapshot.track
        )
          return;
        if (result.version) {
          this.candidate = result.version;
          this.emit({
            state: {
              phase: "available",
              version: result.version,
              notes: result.notes ?? undefined,
              reason,
            },
          });
        } else if (result.waitingForStable) {
          this.emit({ state: { phase: "waiting-for-stable" } });
        } else {
          this.emit({
            state:
              reason === "manual"
                ? { phase: "up-to-date", reason }
                : { phase: "idle", lastReason: reason },
          });
        }
      } catch (error) {
        if (generation !== this.generation) return;
        if (reason === "manual")
          this.emit({
            state: {
              phase: "error",
              operation: "check",
              message: message(error),
            },
          });
        else console.error(`Automatic ${reason} update check failed:`, error);
      } finally {
        if (generation === this.generation) this.checking = null;
      }
    })();
    this.checking = task;
    await task;
  }
  async install() {
    if (this.installing || this.checking || this.snapshot.selecting) return;
    const version = this.candidate;
    if (!version) return this.check();
    this.installing = true;
    this.emit({ state: { phase: "downloading", version, downloadedBytes: 0 } });
    try {
      await this.bridge.install((event) =>
        this.emit({
          state: event.installing
            ? { phase: "installing", version }
            : { phase: "downloading", version, ...event },
        }),
      );
      this.emit({ state: { phase: "installing", version } });
      await this.bridge.relaunch();
    } catch (error) {
      this.installing = false;
      this.emit({
        state: {
          phase: "error",
          operation: "install",
          version,
          message: message(error),
        },
      });
    }
  }
  async dismiss() {
    if (this.installing || this.snapshot.selecting) return;
    this.generation++;
    this.checking = null;
    this.candidate = null;
    this.emit({ state: { phase: "idle" } });
    await this.bridge.clear().catch(console.error);
  }
  dispose() {
    void this.dismiss();
  }
}
