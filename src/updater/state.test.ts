import { describe, expect, it } from "vitest";
import { progressPercent } from "./state";

describe("progressPercent", () => {
  it("bounds known download progress", () => {
    expect(
      progressPercent({
        phase: "downloading",
        version: "1.2.3",
        downloadedBytes: 75,
        totalBytes: 100,
      }),
    ).toBe(75);
    expect(
      progressPercent({
        phase: "downloading",
        version: "1.2.3",
        downloadedBytes: 120,
        totalBytes: 100,
      }),
    ).toBe(100);
  });

  it("leaves unknown-length downloads indeterminate", () => {
    expect(
      progressPercent({
        phase: "downloading",
        version: "1.2.3",
        downloadedBytes: 75,
      }),
    ).toBeUndefined();
  });
});
