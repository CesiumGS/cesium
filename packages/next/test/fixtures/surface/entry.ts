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
