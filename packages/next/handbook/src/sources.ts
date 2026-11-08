/**
 * Every outside source the handbook cites, in one place. To refresh a fact:
 * read the page, update what cites it, set `checked` to today. The page marks
 * a source for rechecking once `checked` is older than `STALE_AFTER_DAYS`.
 *
 * `pageDate` is what the page itself states, if anything. `note` records what
 * couldn't be read, so a gap stays visible rather than being filled from
 * memory.
 */
export interface Source {
  readonly short: string;
  readonly title: string;
  readonly url: string;
  readonly pageDate?: string;
  readonly checked: string;
  readonly note?: string;
}

export const STALE_AFTER_DAYS = 90;

/** Global browser usage with WebGPU, from Can I use with StatCounter. */
export const WEBGPU_USAGE = "88.63%";

export const SOURCES = {
  impl: {
    short: "gpuweb implementation status",
    title: "gpuweb wiki: Implementation Status",
    url: "https://github.com/gpuweb/gpuweb/wiki/Implementation-Status",
    pageDate: "edited 2 Oct 2026",
    checked: "2026-11-08",
  },
  caniuse: {
    short: "Can I use",
    title: "Can I use: WebGPU",
    url: "https://caniuse.com/webgpu",
    pageDate: "StatCounter usage for October 2026",
    checked: "2026-11-08",
  },
  mdn: {
    short: "MDN",
    title: "MDN: WebGPU API",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API",
    checked: "2026-11-08",
    note: "The Baseline banner was read. The compatibility table loads separately and wasn't.",
  },
  survey: {
    short: "Web3D Survey",
    title: "Web3D Survey: WebGPU",
    url: "https://web3dsurvey.com/webgpu",
    checked: "2026-11-08",
    note: "The page states no survey date or period.",
  },
  webgpu: {
    short: "W3C WebGPU",
    title: "WebGPU, W3C Candidate Recommendation Draft",
    url: "https://www.w3.org/TR/webgpu/",
    pageDate: "15 Sep 2026",
    checked: "2026-11-08",
  },
  wgsl: {
    short: "W3C WGSL",
    title: "WGSL, W3C Candidate Recommendation Draft",
    url: "https://www.w3.org/TR/WGSL/",
    pageDate: "6 Nov 2026",
    checked: "2026-11-08",
  },
  proposals: {
    short: "gpuweb proposals",
    title: "gpuweb: proposals index",
    url: "https://github.com/gpuweb/gpuweb/tree/main/proposals",
    checked: "2026-11-08",
  },
  bindless: {
    short: "bindless proposal",
    title: "gpuweb: bindless proposal",
    url: "https://github.com/gpuweb/gpuweb/blob/main/proposals/bindless.md",
    pageDate: "created 13 Oct 2025, status Draft",
    checked: "2026-11-08",
  },
  chrome: {
    short: "What's New in WebGPU",
    title: "Chrome for Developers: What's New in WebGPU",
    url: "https://developer.chrome.com/docs/web-platform/webgpu/news",
    pageDate: "newest entry covers Chrome 155 and 156",
    checked: "2026-11-08",
  },
  tiles: {
    short: "3D Tiles repository",
    title: "CesiumGS/3d-tiles: version history",
    url: "https://github.com/CesiumGS/3d-tiles",
    checked: "2026-11-08",
  },
  crsSource: {
    short: "EXT_geospatial_crs_source",
    title: "CesiumGS/glTF #131: Add EXT_geospatial_crs_source",
    url: "https://github.com/CesiumGS/glTF/pull/131",
    pageDate: "open, opened 1 Sep 2026",
    checked: "2026-11-08",
  },
  ifc: {
    short: "IFC 4.3 documentation",
    title: "buildingSMART: IFC 4.3, IfcMapConversion",
    url: "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcMapConversion.htm",
    checked: "2026-11-08",
    note: "The IfcAlignment and IfcMapConversionScaled pages answered 403 when read. Their use here rests on the plan's own research.",
  },
  chrome146: {
    short: "What's New in WebGPU, Chrome 146",
    title: "Chrome for Developers: What's New in WebGPU (Chrome 146)",
    url: "https://developer.chrome.com/blog/new-in-webgpu-146",
    pageDate: "25 Feb 2026",
    checked: "2026-11-08",
    note: "The posts for Chrome 147 to 156 were read too, and none mentions compatibility mode. A post for 157 doesn't exist yet.",
  },
  chrome136: {
    short: "What's New in WebGPU, Chrome 136",
    title: "Chrome for Developers: What's New in WebGPU (Chrome 136)",
    url: "https://developer.chrome.com/blog/new-in-webgpu-136",
    pageDate: "23 Apr 2025",
    checked: "2026-11-08",
  },
  compatLesson: {
    short: "WebGPU Fundamentals",
    title: "WebGPU Fundamentals: Compatibility Mode",
    url: "https://webgpufundamentals.org/webgpu/lessons/webgpu-compatibility-mode.html",
    pageDate: "a note dated 23 Feb 2026",
    checked: "2026-11-08",
  },
  compatProposal: {
    short: "compatibility mode proposal",
    title: "gpuweb: Compatibility Mode proposal",
    url: "https://github.com/gpuweb/gpuweb/blob/main/proposals/compatibility-mode.md",
    pageDate: "created 10 Oct 2023, status Merged",
    checked: "2026-11-08",
  },
  compatIntent: {
    short: "Intent to Ship",
    title: "blink-dev: Intent to Ship: WebGPU Compatibility mode",
    url: "https://groups.google.com/a/chromium.org/g/Blink-dev/c/N3RlLGCOTJ4",
    pageDate: "13 Jan 2026",
    checked: "2026-11-08",
    note: "Its Windows figure gives no source or date. Its Android figure cites Android's dashboards.",
  },
  blocklist: {
    short: "Chromium's WebGPU blocklist",
    title: "Chromium source: webgpu_blocklist_impl.cc",
    url: "https://chromium.googlesource.com/chromium/src/+/main/gpu/config/webgpu_blocklist_impl.cc",
    pageDate: "the main branch as read",
    checked: "2026-11-08",
  },
  dawn: {
    short: "Dawn's support page",
    title: "Dawn: docs/support.md",
    url: "https://github.com/google/dawn/blob/main/docs/support.md",
    checked: "2026-11-08",
  },
  webgl2Usage: {
    short: "Can I use, WebGL 2",
    title: "Can I use: WebGL 2.0",
    url: "https://caniuse.com/webgl2",
    pageDate: "StatCounter usage for October 2026",
    checked: "2026-11-08",
  },
  webgl2Survey: {
    short: "Web3D Survey, WebGL 2",
    title: "Web3D Survey: WebGL 2",
    url: "https://web3dsurvey.com/webgl2",
    checked: "2026-11-08",
    note: "The page states no survey date or period.",
  },
  surveyCore: {
    short: "Web3D Survey, core features",
    title: "Web3D Survey: core-features-and-limits",
    url: "https://web3dsurvey.com/webgpu/features/core-features-and-limits",
    checked: "2026-11-08",
    note: "The page states no survey date or period.",
  },
  swiftshader: {
    short: "Chromium's SwiftShader page",
    title: "Chromium docs: gpu/swiftshader.md",
    url: "https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md",
    checked: "2026-11-08",
    note: "It covers WebGL, not WebGPU, and gives no removal date.",
  },
  azure: {
    short: "Azure Virtual Desktop docs",
    title: "Microsoft Learn: Enable GPU acceleration for Azure Virtual Desktop",
    url: "https://learn.microsoft.com/en-us/azure/virtual-desktop/graphics-enable-gpu-acceleration",
    pageDate: "updated 29 Aug 2025",
    checked: "2026-11-08",
  },
  ec2Thread: {
    short: "graphics-dev thread",
    title: "graphics-dev: WebGPU on Amazon EC2 Windows Server 2022",
    url: "https://groups.google.com/a/chromium.org/g/graphics-dev/c/GCDQ13K5Drg",
    pageDate: "9 to 15 May 2024",
    checked: "2026-11-08",
    note: "Chrome 124. The thread as read shows no resolution.",
  },
  unattendedThread: {
    short: "blink-dev thread",
    title: "blink-dev: WebGPU on EC2 Windows, requestAdapter failed",
    url: "https://groups.google.com/a/chromium.org/g/blink-dev/c/znkFeiQ2ijQ",
    pageDate: "23 Jul 2024",
    checked: "2026-11-08",
    note: "One user's report.",
  },
  cisa: {
    short: "CISA BOD 26-04",
    title: "CISA: Binding Operational Directive 26-04",
    url: "https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk",
    pageDate: "10 Jun 2026",
    checked: "2026-11-08",
    note: "Its table of remediation times is an image, so those times aren't quoted here.",
  },
  extendedStable: {
    short: "Chrome release channels",
    title: "Chrome Enterprise help: Extended Stable",
    url: "https://support.google.com/chrome/a/answer/16942104",
    checked: "2026-11-08",
    note: "The page states no date.",
  },
  stig: {
    short: "Chrome STIG V2R11",
    title:
      "Google Chrome Current Windows STIG, V2R11, as listed by cyber.trackr.live",
    url: "https://cyber.trackr.live/scap/Google_Chrome_Current_Windows_STIG_SCAP_Benchmark/2/11",
    pageDate: "15 May 2025",
    checked: "2026-11-08",
    note: "A third party's listing. Rule titles were read, not each rule's full text. No later release was looked for.",
  },
  disable3d: {
    short: "Edge policy Disable3DAPIs",
    title: "Microsoft Learn: Disable3DAPIs",
    url: "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/disable3dapis",
    pageDate: "updated 3 Nov 2026",
    checked: "2026-11-08",
  },
  troubleshooting: {
    short: "Chrome's WebGPU troubleshooting",
    title: "Chrome for Developers: WebGPU troubleshooting tips",
    url: "https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips",
    pageDate: "updated 17 Oct 2025",
    checked: "2026-11-08",
  },
  usaAnalytics: {
    short: "analytics.usa.gov",
    title: "analytics.usa.gov: browsers.json",
    url: "https://analytics.usa.gov/data/live/browsers.json",
    pageDate: "taken 5 Feb 2025",
    checked: "2026-11-08",
    note: "The public visiting government sites, not agency staff. It has no browser versions.",
  },
  intel: {
    short: "Intel article 000102979",
    title:
      "Intel: Simple WebGPU application Hangs with Indirect Draw Calls on UHD 700 and Iris Xe iGPUs",
    url: "http://www.intel.com/content/www/us/en/support/articles/000102979/graphics.html",
    pageDate: "last reviewed 07/02/2026, as printed",
    checked: "2026-11-08",
  },
  jpr: {
    short: "Jon Peddie Research",
    title: "Jon Peddie Research: PC GPU shipments, Q2 2026",
    url: "https://www.jonpeddie.com/news/pc-gpu-shipments-increased-10-4-q-q-up-1-1-y-y/",
    pageDate: "3 Sep 2026",
    checked: "2026-11-08",
    note: "The text gives changes in share. The shares themselves are in charts and weren't read.",
  },
  steam: {
    short: "Steam survey",
    title: "Steam Hardware & Software Survey: video cards",
    url: "https://store.steampowered.com/hwsurvey/videocard/",
    pageDate: "October 2026",
    checked: "2026-11-08",
    note: "Publishes no totals per vendor.",
  },
  arcgis: {
    short: "ArcGIS system requirements",
    title: "Esri: ArcGIS Maps SDK for JavaScript system requirements",
    url: "https://developers.arcgis.com/javascript/latest/system-requirements/",
    pageDate: "version 5.1",
    checked: "2026-11-08",
  },
  mapbox: {
    short: "Mapbox GL JS v3 guide",
    title: "Mapbox: Migrate to Mapbox GL JS v3",
    url: "https://docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/",
    checked: "2026-11-08",
    note: "The page states no date.",
  },
  aps: {
    short: "APS Viewer v8 post",
    title: "Autodesk Platform Services: APS Viewer v8 preview is here!",
    url: "https://aps.autodesk.com/node/4105",
    pageDate: "30 Oct 2026",
    checked: "2026-11-08",
  },
  figma: {
    short: "Figma's WebGPU post",
    title: "Figma: Figma rendering, powered by WebGPU",
    url: "https://www.figma.com/blog/figma-rendering-powered-by-webgpu/",
    pageDate: "18 Sep 2025",
    checked: "2026-11-08",
  },
  unity: {
    short: "Unity 6.2 manual",
    title: "Unity Manual: WebGPU (Experimental)",
    url: "https://docs.unity3d.com/6000.2/Documentation/Manual/WebGPU.html",
    pageDate: "built 5 Feb 2026",
    checked: "2026-11-08",
  },
  cesium1140: {
    short: "Cesium releases, April 2026",
    title: "Cesium: Cesium releases in April 2026",
    url: "https://cesium.com/blog/2026/04/01/cesium-releases-in-april-2026",
    pageDate: "1 Apr 2026",
    checked: "2026-11-08",
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
