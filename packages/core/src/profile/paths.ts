// The paths: implementation choices made from the device's facts that make no
// visible difference (docs/superpowers/plans/2026-11-13-engine-profiles.md,
// section 2). A path may change performance but not the image, within the
// parity tolerance. One function chooses them all, from data: each path's
// choices, best first, each with the facts it needs and why. Render code reads
// the result and never the facts (test/deviceFactsSeam.test.ts).
//
// Path names and their strings in `SupportReport.paths` are diagnostic and
// unstable.
import { evaluate } from "./predicate.ts";
import { PROFILE_DATA, unmetSupport, type ProfileData } from "./resolve.ts";
import type { Facts, Predicate } from "./types.ts";
import type { Webgl2Facts } from "./webgl2Facts.ts";

/** How stars are submitted where the world allows indirect draws. */
export type StarSubmissionPath = "indirect" | "direct";

/** What KTX2 (Basis) images are transcoded to. Images not a whole number of 4 × 4 blocks are RGBA8 anyway. */
export type TextureTranscodePath = "bc7" | "astc-4x4" | "etc2-rgba8" | "rgba8";

/** Which exact-list shader translucency uses at 4×: one that writes per sample, or per pixel. */
export type TranslucencyListsPath = "per-sample" | "per-pixel";

/** Whether the GPU's time is measured, with timestamp queries. */
export type GpuTimingPath = "timestamps" | "unavailable";

export interface Paths {
  readonly starSubmission: StarSubmissionPath;
  readonly textureTranscode: TextureTranscodePath;
  readonly translucencyLists: TranslucencyListsPath;
  readonly gpuTiming: GpuTimingPath;
}

/** One choice of a path: taken where `needs` holds (always, without it), if no earlier one was. */
interface PathChoice<Choice extends string> {
  readonly choice: Choice;
  readonly needs?: Predicate;
  readonly reason: string;
}

type PathTable = {
  readonly [P in keyof Paths]: readonly PathChoice<Paths[P]>[];
};

/** Each path's choices, best first. The last needs nothing. */
export const PATHS = {
  // Was `starSubmission()`'s capability read (src/atmosphere/starCells.ts).
  starSubmission: [
    {
      choice: "indirect",
      needs: { has: "indirect-first-instance" },
      reason: "an indirect draw's first instance is honored",
    },
    {
      choice: "direct",
      reason:
        "without indirect-first-instance, an indirect draw's first instance would be silently ignored",
    },
  ],
  // Was `transcodeKtx2()`'s support read (src/io/decoders.ts).
  textureTranscode: [
    {
      choice: "bc7",
      needs: { has: "texture-compression-bc" },
      reason: "BC7 blocks sample on this device",
    },
    {
      choice: "astc-4x4",
      needs: { has: "texture-compression-astc" },
      reason: "ASTC 4 × 4 blocks sample on this device, and BC7 doesn't",
    },
    {
      choice: "etc2-rgba8",
      needs: { has: "texture-compression-etc2" },
      reason: "ETC2 blocks sample on this device, and BC7 and ASTC don't",
    },
    {
      choice: "rgba8",
      reason:
        "no block format samples on this device, so textures are uncompressed, at four times BC7's memory",
    },
  ],
  // Was `createPipelines()`'s probe read (src/scene/RenderContext.ts).
  translucencyLists: [
    {
      choice: "per-pixel",
      needs: { equals: ["probes.storageWritesRunPerSample", false] },
      reason: "a 4× fragment shader's storage writes run once a pixel",
    },
    {
      choice: "per-sample",
      reason:
        "storage writes run once a covered sample, or the probe couldn't tell; per sample is right either way, only slower",
    },
  ],
  // Was `GpuTimer`'s feature read (src/gpu/GpuTimer.ts).
  gpuTiming: [
    {
      choice: "timestamps",
      needs: { has: "timestamp-query" },
      reason: "timestamp queries time the passes",
    },
    {
      choice: "unavailable",
      reason: "without timestamp-query the GPU's time can't be measured",
    },
  ],
} as const satisfies PathTable;

function choose<Choice extends string>(
  choices: readonly PathChoice<Choice>[],
  facts: Facts,
): PathChoice<Choice> {
  const taken = choices.find(
    (c) => c.needs === undefined || evaluate(c.needs, { facts }),
  );
  if (!taken) {
    throw new Error("a path has no choice that needs nothing");
  }
  return taken;
}

/** The engine's paths on a device with `facts`. */
export function paths(facts: Facts, table: PathTable = PATHS): Paths {
  return {
    starSubmission: choose(table.starSubmission, facts).choice,
    textureTranscode: choose(table.textureTranscode, facts).choice,
    translucencyLists: choose(table.translucencyLists, facts).choice,
    gpuTiming: choose(table.gpuTiming, facts).choice,
  };
}

/** Why each path was chosen on a device with `facts`, as `name: choice (reason)` strings. */
export function describePaths(
  facts: Facts,
  table: PathTable = PATHS,
): string[] {
  return (Object.keys(table) as (keyof Paths)[]).map((name) => {
    const { choice, reason } = choose<string>(table[name], facts);
    return `${name}: ${choice} (${reason})`;
  });
}

/** Which moments the engine's translucency stores: its best supported moments step. */
export type MomentsStep = "moments32" | "moments16";

/**
 * The moments step this device supports best (the catalog's `translucency`
 * ladder and its support rules). The moments' targets are the engine's, so
 * this is engine-wide, whichever step a view is given.
 */
export function momentsStep(
  facts: Facts,
  data: ProfileData = PROFILE_DATA,
): MomentsStep {
  return unmetSupport("translucency", "moments32", facts, data).length === 0
    ? "moments32"
    : "moments16";
}

/** What the engine's render context is built for: chosen here, from the facts. */
export interface DeviceChoices {
  readonly paths: Paths;
  readonly moments: MomentsStep;
}

export function deviceChoices(facts: Facts): DeviceChoices {
  return { paths: paths(facts), moments: momentsStep(facts) };
}

/**
 * Why each WebGL 2 path is what it is, as `name: choice (reason)` strings
 * like `describePaths`' (the plan's section 6). Depth and draw submission
 * follow the extensions; the KTX2 target follows the compressed formats.
 */
export function describeWebgl2Paths(facts: Webgl2Facts): string[] {
  const has = (name: string) => facts.extensions.includes(name);
  const transcode = has("EXT_texture_compression_bptc")
    ? ["bc7", "BC7 blocks sample on this device"]
    : has("WEBGL_compressed_texture_astc")
      ? ["astc-4x4", "ASTC 4 × 4 blocks sample on this device, and BC7 doesn't"]
      : has("WEBGL_compressed_texture_etc")
        ? [
            "etc2-rgba8",
            "ETC2 blocks sample on this device, and BC7 and ASTC don't",
          ]
        : [
            "rgba8",
            "no block format samples on this device, so textures are uncompressed",
          ];
  return [
    has("EXT_clip_control")
      ? "depth: reversed-z (EXT_clip_control sets clip depth to 0 to 1)"
      : "depth: log (no EXT_clip_control, so depth is written per fragment)",
    has("WEBGL_multi_draw")
      ? "draws: multi-draw (WEBGL_multi_draw, one call a batch)"
      : "draws: one call per record (no WEBGL_multi_draw)",
    `textureTranscode: ${transcode[0]!} (${transcode[1]!})`,
    "drawing: nothing yet (the empty device clears to the background color)",
  ];
}
