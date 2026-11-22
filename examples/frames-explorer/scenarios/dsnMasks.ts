// The DSN's published receive masks, read from references.json
// (dsn-horizon-masks: DSN 810-005 Module 301's horizon mask spreadsheet), in
// the worker only: the page gets the ones it draws in the evaluation.
import references from "../references.json";
import type { HorizonMask } from "./horizonMask.ts";

const ENTRY = (
  references.entries as unknown as Record<
    string,
    {
      receive: Record<string, readonly string[]>;
      source: { document: string; revision?: string; figures?: string };
    }
  >
)["dsn-horizon-masks"]!;

/** The masks' citation, as the dish's Checks row gives it (Task 6c fix 1). */
export const MASK_SOURCE: {
  document: string;
  publisher: string;
  locator?: string;
} = {
  document: ENTRY.source.document,
  publisher: "NASA JPL, Deep Space Network",
  ...(ENTRY.source.figures !== undefined && {
    locator: ENTRY.source.figures,
  }),
};

/** The published receive mask of `station` ("DSS-43"), as numbers. */
export function dsnMask(station: string): HorizonMask {
  const printed = ENTRY.receive[station];
  if (printed === undefined || printed.length !== 361) {
    throw new Error(
      `references.json dsn-horizon-masks has no 361-value receive mask for ${station}`,
    );
  }
  const mask = printed.map(Number);
  // North is one direction: the 0° row's value at 360° too (DSS-63's sheet
  // gives 6 at 0° and 6.1 at 360°; the entry's notes say so, fix 2).
  mask[360] = mask[0]!;
  return mask;
}
