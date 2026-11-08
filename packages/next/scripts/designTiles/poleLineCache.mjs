// The London ground script's sample cache, checked as it is read back
// (scripts/poleLineGround.mjs; UX review M-d): what it holds goes into a
// generated source file (the sampling date, in a comment) and the poles'
// heights, so only a strict date and finite heights are taken.

/** A sampling date, as the generated file's comment states it. */
export const SAMPLED_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A pole's key: its British National Grid easting and northing, metres, to the centimetre. */
const KEY = /^\d{1,7}\.\d{2},\d{1,7}\.\d{2}$/;

/** A lidar height, ODN metres: finite, within what Great Britain's ground spans. */
export const lidarHeight = (v) =>
  typeof v === "number" && Number.isFinite(v) && v > -100 && v < 1_400;

const isRecord = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * The cache's date and cells, checked: a YYYY-MM-DD date and, for each
 * pole's key, heights only. Anything else is refused, not repaired, with
 * the advice to delete the file and sample again.
 */
export function checkedCache(json, path) {
  const refuse = (why) => {
    throw new Error(
      `poleLineGround: ${path}: ${why}; delete it to sample again`,
    );
  };
  if (!isRecord(json)) {
    refuse("not an object");
  }
  if (typeof json.sampled !== "string" || !SAMPLED_DATE.test(json.sampled)) {
    refuse("its sampled date isn't YYYY-MM-DD");
  }
  if (!isRecord(json.cells)) {
    refuse("no cells");
  }
  const cells = Object.create(null);
  for (const [key, values] of Object.entries(json.cells)) {
    if (
      !KEY.test(key) ||
      !Array.isArray(values) ||
      !values.every(lidarHeight)
    ) {
      refuse("a pole's entry isn't a key and its heights");
    }
    cells[key] = values;
  }
  return { sampled: json.sampled, cells };
}
