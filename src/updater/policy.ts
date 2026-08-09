import { BundleType } from "@tauri-apps/api/app";

export interface InstallPolicy {
  canInstallInApp: boolean;
  packageLabel: string;
}

export function installPolicy(
  bundleType: BundleType | null | undefined,
): InstallPolicy {
  switch (bundleType) {
    case BundleType.App:
      return { canInstallInApp: true, packageLabel: "macOS app" };
    case BundleType.Nsis:
      return { canInstallInApp: true, packageLabel: "Windows NSIS installer" };
    case BundleType.AppImage:
      return { canInstallInApp: true, packageLabel: "Linux AppImage" };
    case BundleType.Msi:
      return { canInstallInApp: false, packageLabel: "Windows MSI" };
    case BundleType.Deb:
      return { canInstallInApp: false, packageLabel: "Linux DEB package" };
    case BundleType.Rpm:
      return { canInstallInApp: false, packageLabel: "Linux RPM package" };
    default:
      return { canInstallInApp: false, packageLabel: "unknown package" };
  }
}
