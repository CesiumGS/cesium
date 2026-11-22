/** A fixture for the surface map test: four exports, one per tier. */

/** @experimental */
export interface Experimental {
  value: number;
}

/** @internal */
export const Hidden = 1;

/** @stable */
export function Stable(): void {}

export type Untiered = string;

/** @stable */
export class Widget {}

export enum Mode {
  Fast,
  Slow,
}

/** A value, then a type of the same name; the tag is on the second. */
export const Both = 1;
/** @experimental */
export type Both = number;

export { original as Renamed } from "./other.ts";
export * as ns from "./other.ts";
