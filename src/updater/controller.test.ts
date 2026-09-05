import { describe, expect, it, vi } from "vitest";
import { UpdaterController, type Bridge, type CheckResult } from "./controller";
const available = (track: "stable" | "latest" = "stable"): CheckResult => ({
  track,
  version: track === "stable" ? "0.2.0" : "0.3.101",
  notes: "notes",
  waitingForStable: false,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
}
function fixture() {
  const bridge = {
    load: vi.fn<Bridge["load"]>().mockResolvedValue("stable"),
    select: vi.fn<Bridge["select"]>().mockResolvedValue(),
    clear: vi.fn<Bridge["clear"]>().mockResolvedValue(),
    check: vi.fn<Bridge["check"]>().mockResolvedValue(available()),
    install: vi.fn<Bridge["install"]>().mockResolvedValue(),
    relaunch: vi.fn<Bridge["relaunch"]>().mockResolvedValue(),
    policy: vi
      .fn<Bridge["policy"]>()
      .mockResolvedValue({ canInstallInApp: true, packageLabel: "AppImage" }),
  };
  const updater = new UpdaterController(bridge, () => {});
  return { bridge, updater };
}
describe("native-owned update controller", () => {
  it("loads persisted track and only installs on explicit action", async () => {
    const { bridge, updater } = fixture();
    bridge.load.mockResolvedValue("latest");
    bridge.check.mockResolvedValue(available("latest"));
    await updater.initialize();
    await updater.check("startup");
    expect(updater.snapshot.track).toBe("latest");
    expect(updater.snapshot.state.phase).toBe("available");
    expect(bridge.install).not.toHaveBeenCalled();
    expect(bridge.relaunch).not.toHaveBeenCalled();
    await updater.check("periodic");
    expect(bridge.check).toHaveBeenCalledTimes(1);
    await updater.install();
    expect(bridge.install).toHaveBeenCalledTimes(1);
    expect(bridge.relaunch).toHaveBeenCalledTimes(1);
  });
  it("ignores an old response after a track switch and persists before checking", async () => {
    const { bridge, updater } = fixture(),
      old = deferred<CheckResult>();
    bridge.check
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(available("latest"));
    await updater.initialize();
    const first = updater.check();
    await vi.waitFor(() => expect(bridge.check).toHaveBeenCalledTimes(1));
    await updater.select("latest");
    old.resolve(available());
    await first;
    expect(bridge.select).toHaveBeenCalledWith("latest");
    expect(updater.snapshot.state).toMatchObject({
      phase: "available",
      version: "0.3.101",
    });
  });
  it("ignores outstanding checks after dismissal and permits rediscovery", async () => {
    const { bridge, updater } = fixture(),
      old = deferred<CheckResult>();
    bridge.check.mockReturnValueOnce(old.promise);
    await updater.initialize();
    const first = updater.check();
    await vi.waitFor(() => expect(bridge.check).toHaveBeenCalledTimes(1));
    await updater.dismiss();
    old.resolve(available());
    await first;
    expect(updater.snapshot.state.phase).toBe("idle");
    expect(bridge.clear).toHaveBeenCalled();
    await updater.check();
    expect(updater.snapshot.state.phase).toBe("available");
  });
  it("deduplicates checks and blocks selection, dismissal and checks during installation", async () => {
    const { bridge, updater } = fixture(),
      wait = deferred<void>(),
      checked = deferred<CheckResult>();
    bridge.check.mockReturnValueOnce(checked.promise);
    await updater.initialize();
    const check = updater.check();
    const duplicate = updater.check();
    checked.resolve(available());
    await Promise.all([check, duplicate]);
    expect(bridge.check).toHaveBeenCalledTimes(1);
    bridge.install.mockReturnValueOnce(wait.promise);
    const install = updater.install();
    await updater.select("latest");
    await updater.dismiss();
    await updater.check();
    await updater.install();
    expect(bridge.select).not.toHaveBeenCalled();
    expect(bridge.clear).not.toHaveBeenCalled();
    expect(bridge.check).toHaveBeenCalledTimes(1);
    expect(bridge.install).toHaveBeenCalledTimes(1);
    wait.resolve();
    await install;
  });
  it("shows waiting for Stable without installing a downgrade", async () => {
    const { bridge, updater } = fixture();
    await updater.initialize();
    bridge.check.mockResolvedValue({
      track: "stable",
      version: null,
      notes: null,
      waitingForStable: true,
    });
    await updater.select("stable");
    expect(updater.snapshot.state.phase).toBe("waiting-for-stable");
    expect(bridge.install).not.toHaveBeenCalled();
  });
  it("preserves selected track on unsupported server and reports manual failures", async () => {
    const { bridge, updater } = fixture();
    await updater.initialize();
    bridge.check.mockRejectedValue(new Error("Latest unavailable"));
    await updater.select("latest");
    expect(updater.snapshot.track).toBe("latest");
    expect(updater.snapshot.state).toMatchObject({
      phase: "error",
      operation: "check",
      message: "Latest unavailable",
    });
  });
  it("retains a retry after failed signature verification and never relaunches", async () => {
    const { bridge, updater } = fixture();
    await updater.initialize();
    await updater.check();
    bridge.install.mockRejectedValueOnce(new Error("invalid signature"));
    await updater.install();
    expect(updater.snapshot.state).toMatchObject({
      phase: "error",
      operation: "install",
    });
    expect(bridge.relaunch).not.toHaveBeenCalled();
    await updater.install();
    expect(bridge.install).toHaveBeenCalledTimes(2);
  });
  it("preserves package-manager policy", async () => {
    const { bridge, updater } = fixture();
    bridge.policy.mockResolvedValue({
      canInstallInApp: false,
      packageLabel: "DEB",
    });
    await updater.initialize();
    await updater.check();
    expect(updater.snapshot.state).toMatchObject({
      phase: "manual-install",
      packageLabel: "DEB",
    });
    expect(bridge.check).not.toHaveBeenCalled();
  });
});

it("retries relaunch without reinstalling or changing the installed track", async () => {
  const { bridge, updater } = fixture();
  await updater.initialize();
  await updater.check();
  bridge.relaunch.mockRejectedValueOnce(new Error("restart unavailable"));
  await updater.install();
  expect(updater.snapshot.state.phase).toBe("relaunch-failed");
  await updater.select("latest");
  await updater.check();
  await updater.dismiss();
  expect(bridge.select).not.toHaveBeenCalled();
  expect(bridge.clear).not.toHaveBeenCalled();
  expect(bridge.check).toHaveBeenCalledTimes(1);
  await updater.install();
  expect(bridge.install).toHaveBeenCalledTimes(1);
  expect(bridge.relaunch).toHaveBeenCalledTimes(2);
});
