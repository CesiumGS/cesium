// The DSN's published receive masks, read from references.json
// (dsn-horizon-masks: DSN 810-005 Module 301's horizon mask spreadsheet), in
// the worker only: the page gets the ones it draws in the evaluation.
import references from "../references.json";
import type { HorizonMask } from "./horizonMask.ts";

const ENTRY = (
  references.entries as unknown as Record<
    string,
    { receive: Record<string, readonly string[]> }
  >
)["dsn-horizon-masks"]!;

/** The published receive mask of `station` ("DSS-43"), as numbers. */
export function dsnMask(station: string): HorizonMask {
  const printed = ENTRY.receive[station];
  if (printed === undefined || printed.length !== 361) {
    throw new Error(
      `references.json dsn-horizon-masks has no 361-value receive mask for ${station}`,
    );
  }
  return printed.map(Number);
}
