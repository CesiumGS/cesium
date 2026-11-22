// The key names each persisted format uses, pinned. A dataset's format number
// (scripts/dataFormats.mjs) names the layout of what is stored, so a key that
// is renamed, added or dropped is a new format: add the new number's list here
// and bump the dataset's format together. Renaming a key under the same
// number fails test/dataFormats.test.ts, as it should.
//
// Keep the older formats' lists: they show what an out-of-date store held.
// A path names a key; `a.b` is `b` inside `a`, and `a[]` is the keys of the
// entries of a list.

/** Every key path in `value`, sorted: objects by key, lists by their first entry. */
export function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.length === 0 ? [] : keyPaths(value[0], `${prefix}[]`);
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  return Object.entries(value)
    .flatMap(([key, inner]) => {
      const path = prefix === "" ? key : `${prefix}.${key}`;
      return [path, ...keyPaths(inner, path)];
    })
    .sort();
}

const SKY_COMMON = [
  "background",
  "background.file",
  "background.holdsFaintStars",
  "background.levels",
  "background.meanLuminance",
  "background.size",
  "calibration",
  "clearance",
  "clearance.by",
  "clearance.date",
  "clearance.note",
  "credits",
  "distributable",
  "format",
  "name",
  "points",
  "points.count",
  "points.file",
  "points.floatsPerStar",
  "sources",
  "sources[].credit",
  "sources[].name",
  "sources[].terms",
  "sources[].url",
];

/** The keys of each dataset's record, by format number. */
export const PINNED_KEYS: Record<string, Record<number, readonly string[]>> = {
  // `calibration`'s own keys are numbers the builder fits; the reader takes any.
  sky: {
    // Until 2026-11-19. The spelling pass of 2026-11-15 changed `modelled` to
    // `modeled` without moving the number: the bug the formats exist to stop.
    1: [...SKY_COMMON, "modelled"].sort(),
    2: [...SKY_COMMON, "modeled"].sort(),
  },
  frames: { 1: ["files", "format", "span"] },
  // The top-level keys; `sha256`, `grids` and `frames` are maps keyed by file or frame.
  designTiles: { 1: ["frames", "grids", "instant", "sha256", "version"] },
  // The record beside a folder of built files: setup's stamp.
  stamp: { 1: ["format"] },
};
