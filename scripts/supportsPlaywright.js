// Checks if the current operating system supports Playwright.
// System requirements based on https://playwright.dev/docs/intro#system-requirements
//
// Exit codes follow the same convention as isCI.js:
//   Exit 1 = supported (triggers the next command in an || chain)
//   Exit 0 = not supported (stops the || chain)

import { platform, release } from "node:os";
import { readFileSync } from "node:fs";

function isWindowsSupported() {
  // Windows 10+ or Windows Server 2016+ (both report NT kernel >= 10.0)
  const major = parseInt(release().split(".")[0], 10);
  return major >= 10;
}

function isMacOSSupported() {
  // Darwin kernel 22.x maps to macOS 13 Ventura, which is the minimum.
  const major = parseInt(release().split(".")[0], 10);
  return major >= 22;
}

function isLinuxSupported() {
  // Supported distros: Ubuntu 20.04+, Debian 11+
  let osRelease;
  try {
    osRelease = readFileSync("/etc/os-release", "utf-8");
  } catch {
    return false;
  }

  const id = osRelease
    .match(/^ID=(.*)$/m)?.[1]
    ?.replace(/"/g, "")
    .trim();
  const versionId = osRelease
    .match(/^VERSION_ID=(.*)$/m)?.[1]
    ?.replace(/"/g, "")
    .trim();

  if (!id || !versionId) {
    return false;
  }

  const majorVersion = parseInt(versionId.split(".")[0], 10);

  switch (id) {
    case "ubuntu":
      return majorVersion >= 20;
    case "debian":
      return majorVersion >= 11;
    default:
      return false;
  }
}

let isSupported = false;

switch (platform()) {
  case "win32":
    isSupported = isWindowsSupported();
    break;
  case "darwin":
    isSupported = isMacOSSupported();
    break;
  case "linux":
    isSupported = isLinuxSupported();
    break;
}

process.exit(isSupported ? 1 : 0);
