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
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
