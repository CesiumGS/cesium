// The DSN's published horizon masks (Task 6b, the owner's choice for the
// dish's near field): each 70 m antenna's receive limit, elevation against
// azimuth, from DSN 810-005 Module 301's horizon mask spreadsheet
// (references.json dsn-horizon-masks). The handbook builds them from the
// terrain (SRTM) and the neighbouring antennas, or the mechanical lower limit
// of about 6°. A dish hears Orion only above its mask.
//
// The masks are given every degree of azimuth; the handbook doesn't say how
// to interpolate between them, so this interpolates linearly. Pure, for the
// page too; the worker reads the masks (dsnMasks.ts).

/** A receive mask: the elevation limit, degrees, at azimuths 0, 1, …, 360 degrees. */
export type HorizonMask = readonly number[];

/** The mask's limit at `azimuth` (degrees, any turn), linearly between its whole degrees. */
export function maskAt(mask: HorizonMask, azimuth: number): number {
  const a = ((azimuth % 360) + 360) % 360;
  const i = Math.floor(a);
  const f = a - i;
  return mask[i]! + f * (mask[i + 1]! - mask[i]!);
}

/** Whether a direction at `elevation` and `azimuth` (degrees) is at or below the mask. */
export function belowMask(
  mask: HorizonMask,
  azimuth: number,
  elevation: number,
): boolean {
  return elevation <= maskAt(mask, azimuth);
}
