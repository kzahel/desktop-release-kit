import { BundleType } from "@tauri-apps/api/app";
import { describe, expect, it } from "vitest";
import { installPolicy } from "./policy";

describe("installPolicy", () => {
  it.each([BundleType.App, BundleType.Nsis, BundleType.AppImage])(
    "allows Tauri-owned package %s",
    (bundleType) => {
      expect(installPolicy(bundleType).canInstallInApp).toBe(true);
    },
  );

  it.each([BundleType.Msi, BundleType.Deb, BundleType.Rpm])(
    "keeps system package %s with its package manager",
    (bundleType) => {
      expect(installPolicy(bundleType).canInstallInApp).toBe(false);
    },
  );

  it("fails closed for an unknown package", () => {
    expect(installPolicy(null)).toEqual({
      canInstallInApp: false,
      packageLabel: "unknown package",
    });
  });
});
